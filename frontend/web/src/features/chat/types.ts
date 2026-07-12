export type PendingHypothesis = {
  hypothesis: string
  branch_path: string
  depth: number
  gemba_instructions: string
  domain_context?: string
}

export type WhyNode = {
  id: string
  branch_path: string
  depth: number
  hypothesis: string
  gemba_result: 'pending' | 'OK' | 'NOK' | 'ROOT_CAUSE'
  gemba_notes: string
  is_root_cause: boolean
  countermeasure: string
}

export type ChatMessage =
  | { type: 'shallow'; role: 'user' | 'assistant'; content: string }
  | { type: 'interrupt'; interrupt_type: 'hypothesis_review'; hypotheses: PendingHypothesis[] }
  | { type: 'interrupt'; interrupt_type: 'gemba_result_review'; node: WhyNode }
  | { type: 'interrupt'; interrupt_type: 'validator_review'; node: WhyNode; confidence?: number }
  | { type: 'interrupt'; interrupt_type: 'countermeasure_review'; node: WhyNode }
