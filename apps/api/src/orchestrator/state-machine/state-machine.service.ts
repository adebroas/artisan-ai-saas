import { Injectable } from '@nestjs/common';
import { CollectedData, ConversationStep } from '../types/orchestrator.types';

@Injectable()
export class StateMachineService {
  getNextStep(
    currentStep: ConversationStep,
    collectedData: CollectedData,
    shouldClose: boolean,
  ): ConversationStep {
    if (shouldClose) return 'closed';
    if (currentStep === 'closing') return 'closed';
    if (currentStep === 'closed') return 'closed';

    if (currentStep === 'greeting') return 'collect_issue';

    if (currentStep === 'collect_issue') {
      return collectedData.issueDescription ? 'collect_name' : 'collect_issue';
    }

    if (currentStep === 'collect_name') {
      return collectedData.fullName ? 'collect_address' : 'collect_name';
    }

    if (currentStep === 'collect_address') {
      return collectedData.address ? 'detect_urgency' : 'collect_address';
    }

    if (currentStep === 'detect_urgency') return 'closing';

    return 'collect_issue';
  }

  isDataComplete(data: CollectedData): boolean {
    return !!(data.issueDescription && data.fullName && data.address);
  }

  getRequiredFieldForStep(step: ConversationStep): keyof CollectedData | null {
    const map: Partial<Record<ConversationStep, keyof CollectedData>> = {
      collect_issue: 'issueDescription',
      collect_name: 'fullName',
      collect_address: 'address',
      detect_urgency: 'urgencyLevel',
    };
    return map[step] ?? null;
  }
}