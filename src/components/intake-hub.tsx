"use client";

import {
  ArrowRight,
  ClipboardPaste,
  FileText,
  FileUp,
  Image as ImageIcon,
  Loader2,
  Phone,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "../lib/i18n/context";
import type { VerificationResult } from "../lib/rules/engine";
import { type DemoCase, DemoCases } from "./demo-cases";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";

interface IntakeHubProps {
  onVerificationComplete: (result: VerificationResult) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function IntakeHub({ onVerificationComplete, isLoading, setIsLoading }: IntakeHubProps) {
  const { language, t } = useTranslation();
  const [activeTab, setActiveTab] = useState("paste");

  // State for Text tab
  const [textInput, setTextInput] = useState("");

  // State for Upload tab
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for Lookup tab
  const [lookupInput, setLookupInput] = useState("");

  // Handle Clipboard Paste
  const handlePasteFromClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setTextInput(clipText);
        toast.success(
          language === "fr" ? "Texte collé depuis le presse-papiers !" : "Pasted from clipboard!",
        );
      }
    } catch {
      toast.error(
        language === "fr"
          ? "Impossible d'accéder au presse-papiers. Veuillez coller manuellement."
          : "Could not access clipboard. Please paste manually.",
      );
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        language === "fr"
          ? "Le fichier est trop volumineux (max 10 Mo)."
          : "File is too large (max 10MB).",
      );
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Trigger Verification API
  const runVerification = async (payload: {
    inputType: "TEXT" | "IMAGE" | "PHONE" | "PDF";
    content?: string;
    imageBase64?: string;
    mimeType?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 429) throw new Error(t.verifyRateLimit);
        if (res.status === 403) throw new Error(t.verifyDenied);
        throw new Error(t.verifyFailed);
      }
      const verification = (data as { verification?: VerificationResult } | null)?.verification;
      if (!verification) throw new Error(t.verifyFailed);

      onVerificationComplete(verification);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.verifyFailed;
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Text
  const handleVerifyText = () => {
    if (!textInput.trim()) {
      toast.error(
        language === "fr"
          ? "Veuillez saisir ou coller un message."
          : "Please enter or paste a message.",
      );
      return;
    }
    runVerification({ inputType: "TEXT", content: textInput });
  };

  // Submit File
  const handleVerifyFile = () => {
    if (!selectedFile) {
      toast.error(
        language === "fr"
          ? "Veuillez choisir un fichier ou un flyer."
          : "Please select a file or flyer.",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      runVerification({
        inputType: selectedFile.type.includes("pdf") ? "PDF" : "IMAGE",
        imageBase64: base64,
        mimeType: selectedFile.type,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  // Submit Lookup
  const handleVerifyLookup = () => {
    if (!lookupInput.trim()) {
      toast.error(
        language === "fr"
          ? "Veuillez entrer un numéro de téléphone ou un email."
          : "Please enter a phone number or email.",
      );
      return;
    }
    runVerification({ inputType: "PHONE", content: lookupInput });
  };

  // Select Preloaded Demo Case
  const handleSelectDemoCase = (demo: DemoCase) => {
    setActiveTab("paste");
    setTextInput(demo.text);
    runVerification({ inputType: "TEXT", content: demo.text });
  };

  return (
    <Card className="w-full border-2 border-authority-900/10 shadow-xl bg-white overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 h-12 bg-slate-100 p-1">
            <TabsTrigger
              value="paste"
              className="text-xs sm:text-sm font-bold flex items-center gap-1.5 data-[state=active]:text-authority-950"
            >
              <FileText className="h-4 w-4" />
              <span>{t.intakeTabPaste}</span>
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="text-xs sm:text-sm font-bold flex items-center gap-1.5 data-[state=active]:text-authority-950"
            >
              <FileUp className="h-4 w-4" />
              <span>{t.intakeTabUpload}</span>
            </TabsTrigger>
            <TabsTrigger
              value="lookup"
              className="text-xs sm:text-sm font-bold flex items-center gap-1.5 data-[state=active]:text-authority-950"
            >
              <Search className="h-4 w-4" />
              <span>{t.intakeTabLookup}</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PASTE TEXT */}
          <TabsContent value="paste" className="space-y-4 m-0">
            <div className="relative">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={t.pastePlaceholder}
                className="min-h-[160px] text-sm leading-relaxed pr-24 font-normal"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                disabled={isLoading}
                className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                <span>{language === "fr" ? "Coller" : "Paste"}</span>
              </button>
            </div>

            <Button
              type="button"
              size="lg"
              onClick={handleVerifyText}
              disabled={isLoading || !textInput.trim()}
              className="w-full gap-2 text-base font-bold bg-authority-950 hover:bg-authority-900 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t.analyzing}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <span>{t.pasteActionBtn}</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </TabsContent>

          {/* TAB 2: UPLOAD FLYER / PDF */}
          <TabsContent value="upload" className="space-y-4 m-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
            />

            {!selectedFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 hover:border-authority-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50 group flex flex-col items-center justify-center space-y-3"
              >
                <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-authority-900 group-hover:scale-110 transition-transform shadow-sm">
                  <Upload className="h-6 w-6 text-authority-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{t.uploadTitle}</p>
                  <p className="text-xs text-slate-500 mt-1">{t.uploadSubtitle}</p>
                </div>
                <span className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 mt-2">
                  {t.uploadBtn}
                </span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white border border-slate-200 text-authority-900">
                      {selectedFile.type.startsWith("image/") ? (
                        <ImageIcon className="h-6 w-6 text-authority-700" />
                      ) : (
                        <FileText className="h-6 w-6 text-authority-700" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB •{" "}
                        {selectedFile.type || "Document"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearSelectedFile}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {filePreview && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-900/5 flex items-center justify-center">
                    <img
                      src={filePreview}
                      alt="Flyer Preview"
                      className="max-h-48 w-auto object-contain rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}

            <Button
              type="button"
              size="lg"
              onClick={handleVerifyFile}
              disabled={isLoading || !selectedFile}
              className="w-full gap-2 text-base font-bold bg-authority-950 hover:bg-authority-900 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t.analyzing}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <span>{t.uploadActionBtn}</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </TabsContent>

          {/* TAB 3: SEARCH PHONE OR EMAIL */}
          <TabsContent value="lookup" className="space-y-4 m-0">
            <div className="relative">
              <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                placeholder={t.lookupPlaceholder}
                className="pl-10 h-12 text-sm"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerifyLookup();
                }}
              />
            </div>

            <Button
              type="button"
              size="lg"
              onClick={handleVerifyLookup}
              disabled={isLoading || !lookupInput.trim()}
              className="w-full gap-2 text-base font-bold bg-authority-950 hover:bg-authority-900 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t.analyzing}</span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 text-emerald-400" />
                  <span>{t.lookupBtn}</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Demo Cases (One-tap preloaded examples) */}
        <DemoCases onSelectCase={handleSelectDemoCase} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}
