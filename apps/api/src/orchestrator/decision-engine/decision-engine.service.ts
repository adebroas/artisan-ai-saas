import { Injectable } from '@nestjs/common';
import {
  CallState,
  CollectedData,
  ExtractionResult,
  OrchestratorDecision,
} from '../types/orchestrator.types';
import { StateMachineService } from '../state-machine/state-machine.service';

@Injectable()
export class DecisionEngineService {
  constructor(private readonly stateMachine: StateMachineService) {}

  decide(
    state: CallState,
    _userMessage: string,
    extracted: ExtractionResult,
  ): OrchestratorDecision {
    // Merge extracted data into collected
    const merged: CollectedData = {
      ...state.collectedData,
      ...(extracted.issueDescription && { issueDescription: extracted.issueDescription }),
      ...(extracted.fullName && { fullName: extracted.fullName }),
      ...(extracted.address && { address: extracted.address }),
      ...(extracted.urgencyLevel && { urgencyLevel: extracted.urgencyLevel }),
      ...(extracted.urgencyDetected !== undefined && {
        urgencyDetected: extracted.urgencyDetected,
      }),
    };

    const isComplete = this.stateMachine.isDataComplete(merged);
    const shouldClose =
      state.currentStep === 'detect_urgency' ||
      state.currentStep === 'closing' ||
      (isComplete && state.currentStep !== 'greeting');

    const shouldMarkUrgent =
      merged.urgencyLevel === 'high' || merged.urgencyDetected === true;

    const nextStep = this.stateMachine.getNextStep(
      state.currentStep,
      merged,
      shouldClose,
    );

    const confidence = extracted.unrecognizedIntent ? 0.3 : 0.85;

    return {
      nextStep,
      shouldClose: nextStep === 'closed',
      shouldMarkUrgent,
      shouldAskQuestion: nextStep !== 'closed',
      requiresTransfer: shouldMarkUrgent,
      extractedData: merged,
      confidence,
    };
  }
}