import crypto from "crypto";
import { getDatabase } from "../database/connection.js";
import { logger } from "../utils/logger.js";

export type ThresholdOperator =
  | "gt" | "gte" | "lt" | "lte" | "eq" | "ne" | "between" | "changes_by_pct";

export type LogicOperator = "AND" | "OR";

export interface RuleCondition {
  field: string;
  operator: ThresholdOperator;
  value: number;
  valueHigh?: number;
  label?: string;
}

export type RuleASTNode =
  | { op: "AND"; conditions: RuleASTNode[] }
  | { op: "OR"; conditions: RuleASTNode[] }
  | { op: "NOT"; condition: RuleASTNode }
  | RuleCondition;

export interface RuleEvaluationInput {
  ruleId?: string;
  ruleName: string;
  assetCode: string;
  conditions?: RuleCondition[];
  logicOperator?: LogicOperator;
  astCondition?: RuleASTNode;
}

export interface ConditionResult {
  field: string;
  operator: ThresholdOperator;
  expectedValue: number;
  actualValue: number;
  passed: boolean;
  label?: string;
}

export interface RuleEvaluationOutput {
  id: string;
  ruleId: string | null;
  ruleName: string;
  assetCode: string;
  triggered: boolean;
  logicOperator: LogicOperator;
  conditionResults: ConditionResult[];
  previewMode: boolean;
  evaluatedAt: string;
  executedBy?: string;
  executionContext?: string;
}

export interface EvaluationOptions {
  previewMode?: boolean;
  executedBy?: string;
  executionContext?: string;
}

function evaluateCondition(
  condition: RuleCondition,
  actualValue: number,
  previousValue?: number
): boolean {
  const { operator, value, valueHigh } = condition;
  switch (operator) {
    case "gt":   return actualValue > value;
    case "gte":  return actualValue >= value;
    case "lt":   return actualValue < value;
    case "lte":  return actualValue <= value;
    case "eq":   return actualValue === value;
    case "ne":   return actualValue !== value;
    case "between":
      return valueHigh !== undefined && actualValue >= value && actualValue <= valueHigh;
    case "changes_by_pct":
      if (previousValue === undefined || previousValue === 0) return false;
      return Math.abs((actualValue - previousValue) / previousValue) * 100 >= value;
    default:
      return false;
  }
}

function isASTGroupNode(node: RuleASTNode): node is { op: "AND" | "OR"; conditions: RuleASTNode[] } | { op: "NOT"; condition: RuleASTNode } {
  return typeof node === "object" && node !== null && "op" in node;
}

function evaluateASTNode(
  node: RuleASTNode,
  metrics: Record<string, number>,
  previousMetrics?: Record<string, number>,
  resultsCollector?: ConditionResult[]
): boolean {
  if (isASTGroupNode(node)) {
    if (node.op === "AND") {
      return node.conditions.every((child) => evaluateASTNode(child, metrics, previousMetrics, resultsCollector));
    }
    if (node.op === "OR") {
      return node.conditions.some((child) => evaluateASTNode(child, metrics, previousMetrics, resultsCollector));
    }
    if (node.op === "NOT") {
      return !evaluateASTNode(node.condition, metrics, previousMetrics, resultsCollector);
    }
    return false;
  }

  // Leaf condition node
  const actualValue = metrics[node.field] ?? 0;
  const prevValue = previousMetrics?.[node.field];
  const passed = evaluateCondition(node, actualValue, prevValue);

  if (resultsCollector) {
    resultsCollector.push({
      field: node.field,
      operator: node.operator,
      expectedValue: node.value,
      actualValue,
      passed,
      label: node.label,
    });
  }

  return passed;
}

export function validateASTNode(node: RuleASTNode): void {
  if (!node || typeof node !== "object") {
    throw new Error("Invalid AST condition node");
  }

  if (isASTGroupNode(node)) {
    if (node.op === "AND" || node.op === "OR") {
      if (!Array.isArray(node.conditions) || node.conditions.length === 0) {
        throw new Error(`Logical ${node.op} group requires a non-empty conditions array`);
      }
      for (const child of node.conditions) {
        validateASTNode(child);
      }
    } else if (node.op === "NOT") {
      if (!node.condition) {
        throw new Error("Logical NOT group requires a child condition");
      }
      validateASTNode(node.condition);
    } else {
      throw new Error(`Unsupported logical operator: ${(node as any).op}`);
    }
  } else {
    // Leaf RuleCondition
    if (!node.field || typeof node.field !== "string" || !node.field.trim()) {
      throw new Error("Condition field cannot be empty");
    }
    const validOperators: ThresholdOperator[] = ["gt", "gte", "lt", "lte", "eq", "ne", "between", "changes_by_pct"];
    if (!validOperators.includes(node.operator)) {
      throw new Error(`Unsupported condition operator: ${node.operator}`);
    }
    if (typeof node.value !== "number" || isNaN(node.value)) {
      throw new Error("Condition value must be a valid number");
    }
    if (node.operator === "between" && (node.valueHigh === undefined || typeof node.valueHigh !== "number" || isNaN(node.valueHigh))) {
      throw new Error('Condition with "between" operator requires valid valueHigh');
    }
  }
}

export class RuleEvaluatorService {
  private static instance: RuleEvaluatorService;

  private constructor() {}

  public static getInstance(): RuleEvaluatorService {
    if (!RuleEvaluatorService.instance) {
      RuleEvaluatorService.instance = new RuleEvaluatorService();
    }
    return RuleEvaluatorService.instance;
  }

  public evaluate(
    input: RuleEvaluationInput,
    metrics: Record<string, number>,
    previousMetrics?: Record<string, number>,
    options: boolean | EvaluationOptions = false
  ): RuleEvaluationOutput {
    const opts: EvaluationOptions = typeof options === "boolean" ? { previewMode: options } : options;
    
    const conditionResults: ConditionResult[] = [];
    let triggered = false;
    let effectiveLogicOp: LogicOperator = input.logicOperator ?? "AND";

    if (input.astCondition) {
      validateASTNode(input.astCondition);
      triggered = evaluateASTNode(input.astCondition, metrics, previousMetrics, conditionResults);
      if (isASTGroupNode(input.astCondition) && (input.astCondition.op === "AND" || input.astCondition.op === "OR")) {
        effectiveLogicOp = input.astCondition.op;
      }
    } else if (input.conditions !== undefined) {
      this.validateConditions(input.conditions);
      const astTree: RuleASTNode = {
        op: input.logicOperator ?? "AND",
        conditions: input.conditions,
      };
      triggered = evaluateASTNode(astTree, metrics, previousMetrics, conditionResults);
    } else {
      throw new Error("Either conditions array or astCondition is required");
    }

    const result: RuleEvaluationOutput = {
      id: crypto.randomUUID(),
      ruleId: input.ruleId ?? null,
      ruleName: input.ruleName,
      assetCode: input.assetCode,
      triggered,
      logicOperator: effectiveLogicOp,
      conditionResults,
      previewMode: opts.previewMode ?? false,
      evaluatedAt: new Date().toISOString(),
      executedBy: opts.executedBy ?? "system",
      executionContext: opts.executionContext ?? "api",
    };

    if (!result.previewMode) {
      this.persistEvaluationLog(result, metrics, opts.executedBy, opts.executionContext).catch((err) =>
        logger.error({ err }, "Failed to persist rule evaluation log")
      );
    }

    return result;
  }

  public evaluateBatch(
    inputs: RuleEvaluationInput[],
    metrics: Record<string, number>,
    previousMetrics?: Record<string, number>,
    options: boolean | EvaluationOptions = false
  ): RuleEvaluationOutput[] {
    const opts: EvaluationOptions = typeof options === "boolean" ? { previewMode: options } : options;
    return inputs.map((input) =>
      this.evaluate(input, metrics, previousMetrics, opts)
    );
  }

  public async getEvaluationHistory(params: {
    ruleId?: string;
    assetCode?: string;
    triggered?: boolean;
    executedBy?: string;
    executionContext?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ evaluations: RuleEvaluationOutput[]; total: number }> {
    const db = getDatabase();
    const limit = Math.min(params.limit ?? 100, 1000);
    const offset = params.offset ?? 0;

    let query = db("rule_evaluator_logs");
    let countQuery = db("rule_evaluator_logs");

    if (params.ruleId) {
      query = query.where("rule_id", params.ruleId);
      countQuery = countQuery.where("rule_id", params.ruleId);
    }
    if (params.assetCode) {
      query = query.where("asset_code", params.assetCode);
      countQuery = countQuery.where("asset_code", params.assetCode);
    }
    if (params.triggered !== undefined) {
      query = query.where("triggered", params.triggered);
      countQuery = countQuery.where("triggered", params.triggered);
    }
    if (params.executedBy) {
      query = query.where("executed_by", params.executedBy);
      countQuery = countQuery.where("executed_by", params.executedBy);
    }
    if (params.executionContext) {
      query = query.where("execution_context", params.executionContext);
      countQuery = countQuery.where("execution_context", params.executionContext);
    }
    if (params.from) {
      query = query.where("evaluated_at", ">=", params.from);
      countQuery = countQuery.where("evaluated_at", ">=", params.from);
    }
    if (params.to) {
      query = query.where("evaluated_at", "<=", params.to);
      countQuery = countQuery.where("evaluated_at", "<=", params.to);
    }

    const [rows, countResult] = await Promise.all([
      query.orderBy("evaluated_at", "desc").limit(limit).offset(offset),
      countQuery.count("id as count").first(),
    ]);

    return {
      evaluations: rows.map((r: Record<string, unknown>) => this.mapRow(r)),
      total: Number(countResult?.count ?? 0),
    };
  }

  public validateConditions(conditions: RuleCondition[]): void {
    if (!conditions || !conditions.length) {
      throw new Error("At least one condition is required");
    }
    for (const cond of conditions) {
      validateASTNode(cond);
    }
  }

  private async persistEvaluationLog(
    result: RuleEvaluationOutput,
    metrics: Record<string, number>,
    executedBy?: string,
    executionContext?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const db = getDatabase();
    await db("rule_evaluator_logs").insert({
      id: result.id,
      rule_id: result.ruleId,
      rule_name: result.ruleName,
      asset_code: result.assetCode,
      input_metrics: JSON.stringify(metrics),
      evaluation_result: JSON.stringify(result),
      triggered: result.triggered,
      logic_operator: result.logicOperator,
      preview_mode: result.previewMode,
      executed_by: executedBy ?? "system",
      execution_context: executionContext ?? "api",
      metadata: metadata ? JSON.stringify(metadata) : "{}",
      evaluated_at: new Date(),
    });
  }

  private mapRow(row: Record<string, unknown>): RuleEvaluationOutput {
    const evaluationResult =
      typeof row.evaluation_result === "string"
        ? JSON.parse(row.evaluation_result as string)
        : row.evaluation_result;
    return {
      id: row.id as string,
      ruleId: row.rule_id as string | null,
      ruleName: row.rule_name as string,
      assetCode: row.asset_code as string,
      triggered: row.triggered as boolean,
      logicOperator: row.logic_operator as LogicOperator,
      conditionResults: evaluationResult?.conditionResults ?? [],
      previewMode: row.preview_mode as boolean,
      evaluatedAt: (row.evaluated_at as Date).toISOString(),
      executedBy: (row.executed_by as string) ?? "system",
      executionContext: (row.execution_context as string) ?? "api",
    };
  }
}

export const ruleEvaluatorService = RuleEvaluatorService.getInstance();
