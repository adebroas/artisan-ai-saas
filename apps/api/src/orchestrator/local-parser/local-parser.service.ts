import { Injectable, Logger } from '@nestjs/common';
import { ConversationStep, LocalParseResult } from '../types/orchestrator.types';

@Injectable()
export class LocalParserService {
  private readonly logger = new Logger(LocalParserService.name);

  /**
   * Attempts to parse the user message locally without calling the LLM.
   * Returns a result with confidence score.
   */
  tryParse(step: ConversationStep, input: string): LocalParseResult {
    const normalized = input.trim().toLowerCase();

    switch (step) {
      case 'collect_name':
        return this.parseName(input);

      case 'detect_urgency':
        return this.parseUrgency(normalized);

      case 'collect_address':
        return this.parseAddress(input);

      default:
        return { success: false, confidence: 0, reason: 'No local parser for this step' };
    }
  }

  private parseName(input: string): LocalParseResult {
    const trimmed = input.trim();
    // Simple heuristic: 2-4 words, each starting with a letter, no digits
    const words = trimmed.split(/\s+/);
    const hasDigits = /\d/.test(trimmed);
    const allWordsAlpha = words.every((w) => /^[a-zA-ZÀ-ÿ'-]+$/.test(w));
    const isReasonableLength = words.length >= 2 && words.length <= 4;

    if (!hasDigits && allWordsAlpha && isReasonableLength) {
      const formatted = words
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      return { success: true, confidence: 0.85, value: formatted };
    }

    return {
      success: false,
      confidence: 0.2,
      reason: 'Could not identify a clean name pattern',
    };
  }

  private parseUrgency(normalized: string): LocalParseResult {
    const highKeywords = [
      'urgent', 'urgence', 'urgente', 'tout de suite', 'immédiatement',
      'maintenant', 'pas de chauffage', 'inondation', 'fuite', 'danger',
      'panne totale', 'impossible', 'bloqué', 'bloquée',
    ];
    const lowKeywords = [
      'pas pressé', 'pas urgente', 'quand vous pouvez', 'tranquille',
      'semaine prochaine', 'à votre convenance',
    ];

    if (highKeywords.some((k) => normalized.includes(k))) {
      return { success: true, confidence: 0.9, value: 'high' };
    }
    if (lowKeywords.some((k) => normalized.includes(k))) {
      return { success: true, confidence: 0.85, value: 'low' };
    }

    return {
      success: false,
      confidence: 0.3,
      reason: 'Urgency level ambiguous, needs LLM',
    };
  }

  private parseAddress(input: string): LocalParseResult {
    const trimmed = input.trim();
    // Heuristic: contains at least one digit and common French address indicators
    const hasNumber = /\d/.test(trimmed);
    const hasStreetIndicator = /(rue|avenue|av\.|boulevard|bd|impasse|allée|place|chemin|route|voie|villa)/i.test(trimmed);

    if (hasNumber && hasStreetIndicator) {
      return { success: true, confidence: 0.8, value: trimmed };
    }
    if (trimmed.length > 10 && hasNumber) {
      return { success: true, confidence: 0.6, value: trimmed };
    }

    return {
      success: false,
      confidence: 0.2,
      reason: 'Address pattern not recognized locally',
    };
  }

  parseYesNo(input: string): LocalParseResult {
    const normalized = input.trim().toLowerCase();
    const yes = ['oui', 'yes', 'absolument', 'tout à fait', 'exact', 'correct', 'effectivement', 'bien sûr'];
    const no = ['non', 'no', 'pas du tout', 'jamais', 'aucunement'];

    if (yes.some((w) => normalized.includes(w))) {
      return { success: true, confidence: 0.95, value: true };
    }
    if (no.some((w) => normalized.includes(w))) {
      return { success: true, confidence: 0.95, value: false };
    }

    return { success: false, confidence: 0.1, reason: 'Not a clear yes/no' };
  }
}