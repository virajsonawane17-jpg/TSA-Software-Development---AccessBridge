import { useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';

interface ScannedTextState {
  scannedText: string;
  capturedPhotoUri: string;
  isScanning: boolean;
  scanError: string | null;
}

export const [ScannedTextProvider, useScannedText] = createContextHook(() => {
  const [state, setState] = useState<ScannedTextState>({
    scannedText: '',
    capturedPhotoUri: '',
    isScanning: false,
    scanError: null,
  });

  const setScannedText = useCallback((text: string) => {
    console.log('Setting scanned text:', text.substring(0, 100) + '...');
    setState((prev) => ({ ...prev, scannedText: text, scanError: null }));
  }, []);

  const setCapturedPhotoUri = useCallback((uri: string) => {
    console.log('Setting captured photo URI:', uri.substring(0, 80));
    setState((prev) => ({ ...prev, capturedPhotoUri: uri }));
  }, []);

  const setIsScanning = useCallback((isScanning: boolean) => {
    setState((prev) => ({ ...prev, isScanning }));
  }, []);

  const setScanError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, scanError: error }));
  }, []);

  const clearScannedText = useCallback(() => {
    setState({ scannedText: '', capturedPhotoUri: '', isScanning: false, scanError: null });
  }, []);

  return useMemo(() => ({
    ...state,
    setScannedText,
    setCapturedPhotoUri,
    setIsScanning,
    setScanError,
    clearScannedText,
  }), [state, setScannedText, setCapturedPhotoUri, setIsScanning, setScanError, clearScannedText]);
});
