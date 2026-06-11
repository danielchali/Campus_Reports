'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { extractGuidedReportFields } from '../utils/api';
import {
  dispatchGuidedApply,
  scrollToReportingForm,
  type GuidedReportFields,
} from '../utils/guidedReportBridge';
import {
  buildStepSequence,
  createEmptyDraft,
  draftToGuidedFields,
  getQuickReplies,
  getReportingContext,
  getStepLabel,
  getStepPrompt,
  isReportingRoute,
  parseBooleanInput,
  parseCategoryInput,
  parseDateInput,
  parseDisciplinaryDetails,
  parseMaintenanceDetails,
  type GuidedReportDraft,
  type GuidedStepId,
  type ReportingContext,
} from '../utils/guidedReporting';

type GuidedMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type UseGuidedReportingOptions = {
  pathname: string;
  autoStart?: boolean;
};

function isAffirmative(input: string) {
  const normalized = input.trim().toLowerCase();
  return ['yes', 'y', 'ok', 'okay', 'confirm', 'use suggested title', 'apply', 'apply to form'].some(
    (token) => normalized === token || normalized.includes(token),
  );
}

function isSkip(input: string) {
  return ['skip', 'skip email', 'skip extras', 'no email', 'none'].includes(
    input.trim().toLowerCase(),
  );
}

export function useGuidedReporting({ pathname, autoStart = false }: UseGuidedReportingOptions) {
  const reportingContext = useMemo(
    () => getReportingContext(pathname),
    [pathname],
  );
  const enabled = isReportingRoute(pathname) && Boolean(reportingContext);

  const [isActive, setIsActive] = useState(false);
  const [draft, setDraft] = useState<GuidedReportDraft>(() =>
    createEmptyDraft(reportingContext?.lockedCategory || null),
  );
  const [currentStep, setCurrentStep] = useState<GuidedStepId>('welcome');
  const [messages, setMessages] = useState<GuidedMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = useMemo(() => {
    if (!reportingContext) return ['welcome'] as GuidedStepId[];
    return buildStepSequence(reportingContext, draft);
  }, [reportingContext, draft]);

  const stepIndex = Math.max(0, steps.indexOf(currentStep));
  const totalSteps = Math.max(steps.length - 1, 1);

  const pushAssistant = useCallback((content: string, nextStep?: GuidedStepId) => {
    setMessages((current) => [...current, { role: 'assistant', content }]);
    if (nextStep) {
      setCurrentStep(nextStep);
      setQuickReplies(getQuickReplies(nextStep, reportingContext!));
    }
  }, [reportingContext]);

  const pushUser = useCallback((content: string) => {
    setMessages((current) => [...current, { role: 'user', content }]);
  }, []);

  const applyDraftToForm = useCallback((nextDraft: GuidedReportDraft) => {
    dispatchGuidedApply(draftToGuidedFields(nextDraft));
  }, []);

  const goToStep = useCallback((step: GuidedStepId, nextDraft = draft) => {
    if (!reportingContext) return;
    setCurrentStep(step);
    setQuickReplies(getQuickReplies(step, reportingContext));
    setMessages((current) => [
      ...current,
      { role: 'assistant', content: getStepPrompt(step, reportingContext, nextDraft) },
    ]);
  }, [draft, reportingContext]);

  const startGuidedReporting = useCallback(() => {
    if (!reportingContext) return;
    const initialDraft = createEmptyDraft(reportingContext.lockedCategory);
    if (reportingContext.lockedCategory) {
      initialDraft.category = reportingContext.lockedCategory;
    }

    const firstStep: GuidedStepId = reportingContext.lockedCategory ? 'narrative' : 'category';

    setIsActive(true);
    setDraft(initialDraft);
    setError(null);
    setCurrentStep(firstStep);
    setMessages([
      {
        role: 'assistant',
        content: `${getStepPrompt('welcome', reportingContext, initialDraft)}\n\n${getStepPrompt(firstStep, reportingContext, initialDraft)}`,
      },
    ]);
    setQuickReplies(getQuickReplies(firstStep, reportingContext));
  }, [reportingContext]);

  const exitGuidedReporting = useCallback(() => {
    setIsActive(false);
    setError(null);
    setIsProcessing(false);
    setQuickReplies([]);
  }, []);

  const advanceFrom = useCallback((step: GuidedStepId, nextDraft = draft) => {
    if (!reportingContext) return;
    const sequence = buildStepSequence(reportingContext, nextDraft);
    const index = sequence.indexOf(step);
    const nextStep = sequence[index + 1] || 'done';
    goToStep(nextStep, nextDraft);
  }, [draft, goToStep, reportingContext]);

  const handleGuidedInput = useCallback(async (rawInput: string) => {
    if (!reportingContext || !isActive) return;

    const input = rawInput.trim();
    if (!input) return;

    pushUser(input);
    setError(null);

    try {
      if (currentStep === 'welcome') {
        advanceFrom('welcome', draft);
        return;
      }

      if (currentStep === 'category') {
        const category = parseCategoryInput(input, reportingContext.mode);
        if (!category) {
          pushAssistant('Please choose **Disciplinary**, **Maintenance**, or **Other**.');
          return;
        }
        const nextDraft = { ...draft, category };
        setDraft(nextDraft);
        advanceFrom('category', nextDraft);
        return;
      }

      if (currentStep === 'narrative') {
        setIsProcessing(true);
        const extracted = await extractGuidedReportFields({
          narrative: input,
          category: draft.category || undefined,
          mode: reportingContext.mode,
        });

        const nextDraft = {
          ...draft,
          description: extracted.description || input,
          title: extracted.title || draft.title,
          location: extracted.location || draft.location,
          incidentDate: extracted.incidentDate || draft.incidentDate,
          category: extracted.category || draft.category,
        };
        setDraft(nextDraft);
        applyDraftToForm({
          ...nextDraft,
          description: nextDraft.description,
          title: nextDraft.title,
        });
        setIsProcessing(false);
        advanceFrom('narrative', nextDraft);
        return;
      }

      if (currentStep === 'title') {
        const nextTitle = isAffirmative(input) ? draft.title : input;
        if (!nextTitle.trim()) {
          pushAssistant('Please provide a short title for the report.');
          return;
        }
        const nextDraft = { ...draft, title: nextTitle.trim() };
        setDraft(nextDraft);
        applyDraftToForm(nextDraft);
        advanceFrom('title', nextDraft);
        return;
      }

      if (currentStep === 'location') {
        const nextDraft = { ...draft, location: input };
        setDraft(nextDraft);
        applyDraftToForm(nextDraft);
        advanceFrom('location', nextDraft);
        return;
      }

      if (currentStep === 'date') {
        const parsedDate = parseDateInput(input);
        if (!parsedDate) {
          pushAssistant('Use **today** or a date like 2026-06-11.');
          return;
        }
        const nextDraft = { ...draft, incidentDate: parsedDate };
        setDraft(nextDraft);
        applyDraftToForm(nextDraft);
        advanceFrom('date', nextDraft);
        return;
      }

      if (currentStep === 'maintenance_details') {
        const nextDraft = parseMaintenanceDetails(input, draft);
        setDraft(nextDraft);
        applyDraftToForm(nextDraft);
        advanceFrom('maintenance_details', nextDraft);
        return;
      }

      if (currentStep === 'disciplinary_details') {
        const nextDraft = parseDisciplinaryDetails(input, draft);
        setDraft(nextDraft);
        applyDraftToForm(nextDraft);
        advanceFrom('disciplinary_details', nextDraft);
        return;
      }

      if (currentStep === 'privacy') {
        if (reportingContext.mode === 'anonymous') {
          if (isSkip(input)) {
            advanceFrom('privacy', draft);
            return;
          }
          const nextDraft = { ...draft, contactEmail: input };
          setDraft(nextDraft);
          applyDraftToForm(nextDraft);
          advanceFrom('privacy', nextDraft);
          return;
        }

        const anonymous = parseBooleanInput(input);
        if (anonymous === null) {
          pushAssistant('Reply **yes** for anonymous handling or **no** to use your account.');
          return;
        }
        const nextDraft = { ...draft, anonymous };
        setDraft(nextDraft);
        applyDraftToForm(nextDraft);
        advanceFrom('privacy', nextDraft);
        return;
      }

      if (currentStep === 'review') {
        if (isAffirmative(input)) {
          applyDraftToForm(draft);
          scrollToReportingForm();
          advanceFrom('review', draft);
          return;
        }
        pushAssistant('Tell me which field to change (title, location, date, description, category), or reply **apply** to fill the form.');
        return;
      }

      pushAssistant('Guided reporting is complete. You can submit the form when ready, or exit guided mode to ask general questions.');
    } catch (err) {
      setIsProcessing(false);
      setError(err instanceof Error ? err.message : 'Guided reporting failed. Please try again.');
    }
  }, [
    applyDraftToForm,
    advanceFrom,
    currentStep,
    draft,
    isActive,
    pushAssistant,
    pushUser,
    reportingContext,
  ]);

  const handleQuickReply = useCallback((reply: string) => {
    handleGuidedInput(reply);
  }, [handleGuidedInput]);

  useEffect(() => {
    if (!enabled) {
      exitGuidedReporting();
      return;
    }

    const nextDraft = createEmptyDraft(reportingContext?.lockedCategory || null);
    if (reportingContext?.lockedCategory) {
      nextDraft.category = reportingContext.lockedCategory;
    }
    setDraft(nextDraft);
  }, [enabled, exitGuidedReporting, pathname, reportingContext?.lockedCategory]);

  useEffect(() => {
    if (!enabled || !autoStart) return;
    startGuidedReporting();
  }, [autoStart, enabled, startGuidedReporting]);

  return {
    enabled,
    reportingContext: reportingContext as ReportingContext | null,
    isActive,
    isProcessing,
    error,
    messages,
    quickReplies,
    currentStep,
    stepIndex,
    totalSteps,
    stepLabel: getStepLabel(currentStep),
    draft,
    startGuidedReporting,
    exitGuidedReporting,
    handleGuidedInput,
    handleQuickReply,
  };
}
