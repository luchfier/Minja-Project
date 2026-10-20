import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { PackageItem } from '../types/package';
import { CustomerSession } from '../types/session';
import { CreatePaymentResponse } from '../types/payment';
import { photoboothApi } from '../services/photoboothApi';

export type CustomerFlowStep =
  | 'WELCOME'
  | 'PACKAGE'
  | 'PAYMENT'
  | 'CAMERA'
  | 'EDITOR'
  | 'ADD_PRINT'
  | 'DELIVERY';

export interface EditedFrameItem {
  id: string;
  title: string;
  layoutUrl: string;
  templateName?: string;
  slotsCount?: number;
}

export interface SelectedPrintItem {
  id: string;
  url: string;
  type: 'frame' | 'raw';
  title: string;
  copies: number;
}

interface SessionContextValue {
  step: CustomerFlowStep;
  session: CustomerSession | null;
  selectedPackage: PackageItem | null;
  paymentData: CreatePaymentResponse | null;
  capturedPhotos: string[];
  selectedPhotoUrls: string[];
  setSelectedPhotoUrls: (urls: string[]) => void;
  finalLayoutImageUrl: string | null;
  setFinalLayoutImageUrl: (url: string | null) => void;
  editedFrames: EditedFrameItem[];
  setEditedFrames: (frames: EditedFrameItem[]) => void;
  selectedPrintItems: SelectedPrintItem[];
  setSelectedPrintItems: (items: SelectedPrintItem[]) => void;
  generatedGifUrl: string | null;
  setGeneratedGifUrl: (url: string | null) => void;
  additionalPrints: number;
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  isProcessing: boolean;
  sessionSecondsLeft: number;
  isSessionTimedOut: boolean;
  setIsSessionTimedOut: (timedOut: boolean) => void;
  
  // Actions
  startFlow: () => void;
  selectPackage: (pkg: PackageItem) => Promise<boolean>;
  setPaymentVerified: () => void;
  addCapturedPhoto: (dataUrl: string) => void;
  deletePhoto: (index: number) => void;
  toggleSelectPhoto: (dataUrl: string) => void;
  goToCamera: () => void;
  goToEditor: () => void;
  goToAddPrint: () => void;
  setAdditionalPrints: (count: number) => void;
  goToDelivery: () => void;
  resetToWelcome: () => void;
  cancelSession: () => Promise<void>;
  updatePaymentData: (data: CreatePaymentResponse) => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [step, setStep] = useState<CustomerFlowStep>('WELCOME');
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [paymentData, setPaymentData] = useState<CreatePaymentResponse | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<string[]>([]);
  const [finalLayoutImageUrl, setFinalLayoutImageUrl] = useState<string | null>(null);
  const [editedFrames, setEditedFrames] = useState<EditedFrameItem[]>([]);
  const [selectedPrintItems, setSelectedPrintItems] = useState<SelectedPrintItem[]>([]);
  const [generatedGifUrl, setGeneratedGifUrl] = useState<string | null>(null);
  const [additionalPrints, setAdditionalPrints] = useState<number>(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-classic-4r-2');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number>(180);
  const [isSessionTimedOut, setIsSessionTimedOut] = useState<boolean>(false);

  const startFlow = useCallback(() => {
    setStep('PACKAGE');
  }, []);

  const selectPackage = useCallback(async (pkg: PackageItem): Promise<boolean> => {
    setIsProcessing(true);
    try {
      setSelectedPackage(pkg);
      const sessionRes = await photoboothApi.createSession(pkg.id);
      if (sessionRes.success) {
        setSession(sessionRes.data);
        const paymentRes = await photoboothApi.createPayment(sessionRes.data.sessionId);
        if (paymentRes.success) {
          setPaymentData(paymentRes.data);
          setStep('PAYMENT');
          return true;
        }
      }
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const setPaymentVerified = useCallback(() => {
    const duration = selectedPackage?.durationSeconds || 180;
    setSessionSecondsLeft(duration);
    setIsSessionTimedOut(false);
    setStep('CAMERA');
  }, [selectedPackage]);

  const addCapturedPhoto = useCallback((dataUrl: string) => {
    setCapturedPhotos((prev) => [...prev, dataUrl]);
  }, []);

  const deletePhoto = useCallback((index: number) => {
    setCapturedPhotos((prev) => {
      const removed = prev[index];
      setSelectedPhotoUrls((sel) => sel.filter((url) => url !== removed));
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const toggleSelectPhoto = useCallback((dataUrl: string) => {
    setSelectedPhotoUrls((prev) => {
      if (prev.includes(dataUrl)) {
        return prev.filter((u) => u !== dataUrl);
      } else {
        return [...prev, dataUrl];
      }
    });
  }, []);

  const goToCamera = useCallback(() => {
    setStep('CAMERA');
  }, []);

  const goToEditor = useCallback(() => {
    setStep('EDITOR');
  }, []);

  const goToAddPrint = useCallback(() => {
    setStep('ADD_PRINT');
  }, []);

  const goToDelivery = useCallback(() => {
    setStep('DELIVERY');
  }, []);

  const resetToWelcome = useCallback(() => {
    setStep('WELCOME');
    setSession(null);
    setSelectedPackage(null);
    setPaymentData(null);
    setCapturedPhotos([]);
    setSelectedPhotoUrls([]);
    setFinalLayoutImageUrl(null);
    setEditedFrames([]);
    setSelectedPrintItems([]);
    setGeneratedGifUrl(null);
    setAdditionalPrints(0);
    setIsProcessing(false);
    setIsSessionTimedOut(false);
    setSessionSecondsLeft(180);
  }, []);

  const cancelSession = useCallback(async () => {
    if (session) {
      await photoboothApi.cancelSession(session.sessionId);
    }
    resetToWelcome();
  }, [session, resetToWelcome]);

  // Continuous session timer running across CAMERA and EDITOR
  useEffect(() => {
    if (step !== 'CAMERA' && step !== 'EDITOR') {
      return;
    }

    if (isSessionTimedOut) {
      return;
    }

    const timer = setInterval(() => {
      setSessionSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsSessionTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, isSessionTimedOut]);

  return (
    <SessionContext.Provider
      value={{
        step,
        session,
        selectedPackage,
        paymentData,
        capturedPhotos,
        selectedPhotoUrls,
        setSelectedPhotoUrls,
        finalLayoutImageUrl,
        setFinalLayoutImageUrl,
        editedFrames,
        setEditedFrames,
        selectedPrintItems,
        setSelectedPrintItems,
        generatedGifUrl,
        setGeneratedGifUrl,
        additionalPrints,
        selectedTemplateId,
        setSelectedTemplateId,
        isProcessing,
        sessionSecondsLeft,
        isSessionTimedOut,
        setIsSessionTimedOut,
        startFlow,
        selectPackage,
        setPaymentVerified,
        addCapturedPhoto,
        deletePhoto,
        toggleSelectPhoto,
        goToCamera,
        goToEditor,
        goToAddPrint,
        setAdditionalPrints,
        goToDelivery,
        resetToWelcome,
        cancelSession,
        updatePaymentData: setPaymentData,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession harus digunakan di dalam SessionProvider');
  }
  return context;
};
