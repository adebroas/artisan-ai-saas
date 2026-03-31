import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { StateStoreService } from './state-store.service';
import {
  CallState,
  CollectedData,
  ConversationStep,
  ConversationTurn,
} from '../types/orchestrator.types';

@Injectable()
export class ConversationStateService {
  constructor(private readonly stateStore: StateStoreService) {}

  async createSession(
    businessId: string,
    callerPhone?: string,
  ): Promise<CallState> {
    const now = new Date().toISOString();
    const state: CallState = {
      sessionId: uuidv4(),
      businessId,
      status: 'active',
      currentStep: 'greeting',
      callerPhone,
      collectedData: callerPhone ? { callerPhone } : {},
      lastAssistantMessage: '',
      history: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.stateStore.save(state);
    return state;
  }

  async getSession(sessionId: string): Promise<CallState> {
    const state = await this.stateStore.get(sessionId);
    if (!state) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }
    return state;
  }

  // Exposé publiquement pour patcher callId ou autres champs directs
  async saveState(state: CallState): Promise<void> {
    state.updatedAt = new Date().toISOString();
    await this.stateStore.save(state);
  }

  async updateStep(
    sessionId: string,
    step: ConversationStep,
  ): Promise<CallState> {
    const state = await this.getSession(sessionId);
    state.currentStep = step;
    state.updatedAt = new Date().toISOString();
    await this.stateStore.save(state);
    return state;
  }

  async mergeCollectedData(
    sessionId: string,
    data: Partial<CollectedData>,
  ): Promise<CallState> {
    const state = await this.getSession(sessionId);
    state.collectedData = { ...state.collectedData, ...data };
    state.updatedAt = new Date().toISOString();
    await this.stateStore.save(state);
    return state;
  }

  async appendTurn(
    sessionId: string,
    turn: ConversationTurn,
  ): Promise<void> {
    const state = await this.getSession(sessionId);
    const maxHistory = 20;
    state.history = [...state.history, turn].slice(-maxHistory);
    state.updatedAt = new Date().toISOString();
    if (turn.role === 'assistant') {
      state.lastAssistantMessage = turn.content;
    }
    await this.stateStore.save(state);
  }

  async closeSession(sessionId: string): Promise<CallState> {
    const state = await this.getSession(sessionId);
    state.status = 'closed';
    state.currentStep = 'closed';
    state.closedAt = new Date().toISOString();
    state.updatedAt = new Date().toISOString();
    await this.stateStore.save(state);
    return state;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.stateStore.delete(sessionId);
  }
}