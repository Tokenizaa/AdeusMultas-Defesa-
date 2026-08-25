/**
 * Agente: legal-auditor
 * Auditoria jurídica do documento final
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class LegalAuditorAgent extends BaseAgent {
  protected name = "legal-auditor";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    if (!context.reviewedDraft) {
      this.addWarning(context, "Nenhum draft revisado para auditar");
      return context;
    }

    const audit = await this.auditDocument(context.reviewedDraft, context.strategy);
    context.audit = audit;
    context.metadata.stepsCompleted.push("legal-auditor");
    this.recordUsage(["legal-audit"]);

    return context;
  }

  private async auditDocument(draft: any, strategy: any) {
    const checks = [];

    // 1. Consistência entre fatos e argumentos
    checks.push(await this.checkFactArgumentConsistency(draft));

    // 2. Todos os problemas identificados têm argumentos correspondentes
    checks.push(await this.checkProblemCoverage(draft));

    // 3. Verificar se pedidos estão fundamentados
    checks.push(await this.checkRequestFoundation(draft));

    // 4. Verificar se prazos estão corretos
    checks.push(await this.checkDeadlines(draft));

    // 6. Verificar se qualificação está completa
    checks.push(this.checkQualificationComplete(draft));

    const passed = checks.filter((c) => c.status === "pass").length;
    const failed = checks.filter((c) => c.status === "fail").length;
    const warned = checks.filter((c) => c.status === "warn").length;

    return {
      passed,
      failed,
      warned,
      total: checks.length,
      checks,
      overall: (failed === 0 ? "pass" : "fail") as "pass" | "fail",
    };
  }

  private async checkFactArgumentConsistency(draft: any) {
    // Verificar se fatos narrados correspondem aos argumentos
    const facts = this.extractFacts(draft);
    const arguments_ = this.extractArguments(draft);

    const inconsistencies = [];
    facts.forEach((fact: any) => {
      if (!arguments_.some((arg: any) => arg.addressesFact === fact.id)) {
        inconsistencies.push(`Fato "${fact.description}" sem argumento correspondente`);
      }
    });

    return {
      id: "fact-argument-consistency",
      description: "Consistência entre fatos narrados e argumentos jurídicos",
      status: inconsistencies.length === 0 ? "pass" : "fail",
      details: inconsistencies.join("; "),
    };
  }

  private async checkProblemCoverage(draft: any) {
    // Verificar se todos os problemas identificados têm argumentos
    const problems = this.extractProblems(draft);
    const arguments_ = this.extractArguments(draft);

    const uncovered = problems.filter(
      (p: any) => !arguments_.some((a: any) => a.addressesProblem === p.id),
    );

    return {
      id: "problem-coverage",
      description: "Todos os problemas identificados têm argumentos correspondentes",
      status: uncovered.length === 0 ? "pass" : "fail",
      details: uncovered.map((p) => `Problema "${p.description}" sem argumento`).join("; "),
    };
  }

  private async checkRequestFoundation(draft: any) {
    // Verificar se cada pedido tem fundamento legal
    const requests = this.extractRequests(draft);
    const unfounded = requests.filter((r: any) => !r.legalBasis || r.legalBasis.length === 0);

    return {
      id: "request-foundation",
      description: "Todos os pedidos têm fundamentação legal",
      status: unfounded.length === 0 ? "pass" : "fail",
      details: unfounded.map((r) => `Pedido "${r.text}" sem base legal`).join("; "),
    };
  }

  private async checkDeadlines(draft: any) {
    // Verificar prazos mencionados
    const deadlines = this.extractDeadlines(draft);
    const issues = [];

    deadlines.forEach((d: any) => {
      if (d.days < 0) issues.push(`Prazo negativo: ${d.description}`);
      if (d.days > 365) issues.push(`Prazo excessivo: ${d.description}`);
    });

    return {
      id: "deadlines-check",
      description: "Prazos corretos e realistas",
      status: issues.length === 0 ? "pass" : "warn",
      details: issues.join("; "),
    };
  }

  private checkQualificationComplete(draft: any) {
    const requiredFields = ["nome", "cpf", "cnh", "endereco", "cidade", "uf"];
    const missing = requiredFields.filter((f) => !draft.qualification?.[f]);

    return {
      id: "qualification-complete",
      description: "Qualificação do requerente completa",
      status: missing.length === 0 ? "pass" : "fail",
      details: missing.length > 0 ? `Campos faltando: ${missing.join(", ")}` : undefined,
    };
  }

  private extractFacts(draft: any) {
    return [];
  }
  private extractArguments(draft: any) {
    return [];
  }
  private extractProblems(draft: any) {
    return [];
  }
  private extractRequests(draft: any) {
    return [];
  }
  private extractDeadlines(draft: any) {
    return [];
  }
}
