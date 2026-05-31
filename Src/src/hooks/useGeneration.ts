import { useCallback, useState } from 'react';
import type {
  GenerationRequest,
  GenerationResult
} from '../../shared/types';
import { imageApi } from '../services/imageApi';
import { useImageLibrary } from './useImageLibrary';

export type GenerationStatus =
  | 'idle'
  | 'preparing'
  | 'generating'
  | 'saving'
  | 'done'
  | 'error';

interface UseGenerationValue {
  status: GenerationStatus;
  busy: boolean;
  error: string | null;
  resultUrl: string | null;
  generate: (request: GenerationRequest) => Promise<GenerationResult | null>;
  reset: () => void;
}

const statusText: Record<GenerationStatus, string> = {
  idle: '',
  preparing: 'Preparing sources',
  generating: 'Generating image',
  saving: 'Saving result',
  done: 'Done',
  error: 'Error'
};

export function getStatusText(status: GenerationStatus): string {
  return statusText[status];
}

export function useGeneration(): UseGenerationValue {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { addItem } = useImageLibrary();

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setResultUrl(null);
  }, []);

  const generate = useCallback(
    async (request: GenerationRequest): Promise<GenerationResult | null> => {
      setError(null);
      setResultUrl(null);
      setStatus(request.images && request.images.length ? 'preparing' : 'generating');
      try {
        setStatus('generating');
        const result = await imageApi.generate(request);
        if (!result.success) {
          setStatus('error');
          setError(result.error ?? 'Generation failed.');
          return result;
        }
        setStatus('saving');
        if (result.dataUrl) {
          setResultUrl(result.dataUrl);
        }
        if (result.image && result.dataUrl) {
          addItem({ ...result.image, dataUrl: result.dataUrl });
        }
        setStatus('done');
        return result;
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Generation failed.');
        return null;
      }
    },
    [addItem]
  );

  return {
    status,
    busy: status === 'preparing' || status === 'generating' || status === 'saving',
    error,
    resultUrl,
    generate,
    reset
  };
}
