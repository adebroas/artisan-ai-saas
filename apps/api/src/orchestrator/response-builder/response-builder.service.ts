import { Injectable } from '@nestjs/common';
import { CollectedData, ConversationStep } from '../types/orchestrator.types';

@Injectable()
export class ResponseBuilderService {
  build(
    step: ConversationStep,
    collectedData: CollectedData,
    isUrgent: boolean,
  ): string {
    switch (step) {
      case 'greeting':
        return "Bonjour, vous etes bien en contact avec notre service. Comment puis-je vous aider aujourd'hui ?";

      case 'collect_issue':
        return "Pouvez-vous me decrire votre probleme ?";

      case 'collect_name':
        return "Merci. Pouvez-vous me donner votre nom complet ?";

      case 'collect_address': {
        const prenom = collectedData.fullName
          ? collectedData.fullName.split(' ')[0]
          : '';
        return `Merci${prenom ? ' ' + prenom : ''}. Quelle est votre adresse d'intervention ?`;
      }

      case 'detect_urgency':
        return "Est-ce une situation urgente, ou pouvez-vous attendre quelques heures ?";

      case 'closing':
      case 'closed': {
        const urgentNote = isUrgent
          ? ' Votre demande est marquee urgente et sera traitee en priorite.'
          : '';
        return `Parfait, j'ai bien enregistre votre demande.${urgentNote} Nous vous rappelons tres prochainement. Bonne journee !`;
      }

      default:
        return "Pouvez-vous repeter votre demande ?";
    }
  }

  buildSummary(collectedData: CollectedData): string {
    const lines: string[] = ["Resume de l'appel :"];
    if (collectedData.issueDescription)
      lines.push(`- Probleme : ${collectedData.issueDescription}`);
    if (collectedData.fullName)
      lines.push(`- Nom : ${collectedData.fullName}`);
    if (collectedData.address)
      lines.push(`- Adresse : ${collectedData.address}`);
    if (collectedData.urgencyLevel)
      lines.push(`- Urgence : ${collectedData.urgencyLevel}`);
    if (collectedData.callerPhone)
      lines.push(`- Telephone : ${collectedData.callerPhone}`);
    return lines.join('\n');
  }
}