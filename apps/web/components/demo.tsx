"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { CodeBlock } from "./code-block";

const SIMULATION_PROMPT = "Create a contact form with name, email, and message";

interface UIElement {
  key: string;
  type: string;
  props: Record<string, unknown>;
  children?: string[];
}

interface UITree {
  root: string;
  elements: Record<string, UIElement>;
}

interface SimulationStage {
  tree: UITree;
  stream: string;
}

const SIMULATION_STAGES: SimulationStage[] = [
  {
    tree: { root: "form", elements: { form: { key: "form", type: "Form", props: { title: "Contact Us" }, children: [] } } },
    stream: '{"op":"set","path":"/root","value":"form"}',
  },
  {
    tree: { root: "form", elements: { form: { key: "form", type: "Form", props: { title: "Contact Us" }, children: ["name"] }, name: { key: "name", type: "Input", props: { label: "Name", name: "name" } } } },
    stream: '{"op":"add","path":"/elements/form","value":{"key":"form","type":"Form","props":{"title":"Contact Us"},"children":["name"]}}',
  },
  {
    tree: { root: "form", elements: { form: { key: "form", type: "Form", props: { title: "Contact Us" }, children: ["name", "email"] }, name: { key: "name", type: "Input", props: { label: "Name", name: "name" } }, email: { key: "email", type: "Input", props: { label: "Email", name: "email" } } } },
    stream: '{"op":"add","path":"/elements/email","value":{"key":"email","type":"Input","props":{"label":"Email","name":"email"}}}',
  },
  {
    tree: { root: "form", elements: { form: { key: "form", type: "Form", props: { title: "Contact Us" }, children: ["name", "email", "message"] }, name: { key: "name", type: "Input", props: { label: "Name", name: "name" } }, email: { key: "email", type: "Input", props: { label: "Email", name: "email" } }, message: { key: "message", type: "Textarea", props: { label: "Message", name: "message" } } } },
    stream: '{"op":"add","path":"/elements/message","value":{"key":"message","type":"Textarea","props":{"label":"Message","name":"message"}}}',
  },
  {
    tree: { root: "form", elements: { form: { key: "form", type: "Form", props: { title: "Contact Us" }, children: ["name", "email", "message", "submit"] }, name: { key: "name", type: "Input", props: { label: "Name", name: "name" } }, email: { key: "email", type: "Input", props: { label: "Email", name: "email" } }, message: { key: "message", type: "Textarea", props: { label: "Message", name: "message" } }, submit: { key: "submit", type: "Button", props: { label: "Send Message", action: "submit" } } } },
    stream: '{"op":"add","path":"/elements/submit","value":{"key":"submit","type":"Button","props":{"label":"Send Message","action":"submit"}}}',
  },
];

const CODE_EXAMPLE = `import { createCatalog } from '@json-render/core';
import { z } from 'zod';

export const catalog = createCatalog({
  components: {
    Form: {
      props: z.object({
        title: z.string(),
      }),
      hasChildren: true,
    },
    Input: {
      props: z.object({
        label: z.string(),
        name: z.string(),
      }),
    },
    Textarea: {
      props: z.object({
        label: z.string(),
        name: z.string(),
      }),
    },
    Button: {
      props: z.object({
        label: z.string(),
        action: z.string(),
      }),
    },
  },
});`;

type Mode = "simulation" | "interactive";
type Phase = "typing" | "streaming" | "complete";
type Tab = "stream" | "json" | "code";

function parsePatch(line: string): { op: string; path: string; value: unknown } | null {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) return null;
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function applyPatch(tree: UITree, patch: { op: string; path: string; value: unknown }): UITree {
  const newTree = { ...tree, elements: { ...tree.elements } };

  if (patch.path === "/root") {
    newTree.root = patch.value as string;
    return newTree;
  }

  if (patch.path.startsWith("/elements/")) {
    const key = patch.path.slice("/elements/".length).split("/")[0];
    if (key && (patch.op === "set" || patch.op === "add")) {
      newTree.elements[key] = patch.value as UIElement;
    }
  }

  return newTree;
}

export function Demo() {
  const [mode, setMode] = useState<Mode>("simulation");
  const [phase, setPhase] = useState<Phase>("typing");
  const [typedPrompt, setTypedPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [stageIndex, setStageIndex] = useState(-1);
  const [streamLines, setStreamLines] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("json");
  const [actionFired, setActionFired] = useState(false);
  const [tree, setTree] = useState<UITree | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const currentSimulationStage = stageIndex >= 0 ? SIMULATION_STAGES[stageIndex] : null;

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    if (mode === "simulation") {
      // Skip to interactive mode
      setMode("interactive");
      setPhase("complete");
      setTypedPrompt(SIMULATION_PROMPT);
      setUserPrompt("");
    }
    setIsLoading(false);
  }, [mode]);

  // Typing effect for simulation
  useEffect(() => {
    if (mode !== "simulation" || phase !== "typing") return;

    let i = 0;
    const interval = setInterval(() => {
      if (i < SIMULATION_PROMPT.length) {
        setTypedPrompt(SIMULATION_PROMPT.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setPhase("streaming"), 500);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [mode, phase]);

  // Streaming effect for simulation
  useEffect(() => {
    if (mode !== "simulation" || phase !== "streaming") return;

    let i = 0;
    const interval = setInterval(() => {
      if (i < SIMULATION_STAGES.length) {
        const stage = SIMULATION_STAGES[i];
        if (stage) {
          setStageIndex(i);
          setStreamLines((prev) => [...prev, stage.stream]);
          setTree(stage.tree);
        }
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setPhase("complete");
          setMode("interactive");
          setUserPrompt("");
        }, 500);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [mode, phase]);

  const handleSubmit = useCallback(async () => {
    if (!userPrompt.trim() || isLoading) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setStreamLines([]);
    setTree({ root: "", elements: {} });

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentTree: UITree = { root: "", elements: {} };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const patch = parsePatch(line);
          if (patch) {
            currentTree = applyPatch(currentTree, patch);
            setTree({ ...currentTree });
            setStreamLines((prev) => [...prev, line.trim()]);
          }
        }
      }

      if (buffer.trim()) {
        const patch = parsePatch(buffer);
        if (patch) {
          currentTree = applyPatch(currentTree, patch);
          setTree({ ...currentTree });
          setStreamLines((prev) => [...prev, buffer.trim()]);
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Generation error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userPrompt, isLoading]);

  const handleAction = () => {
    setActionFired(true);
    setTimeout(() => setActionFired(false), 2000);
  };

  // Render a single element
  const renderElement = (element: UIElement, elements: Record<string, UIElement>): React.ReactNode => {
    const { type, props, children: childKeys = [] } = element;
    const renderChildren = () => childKeys.map((key) => {
      const child = elements[key];
      return child ? renderElement(child, elements) : null;
    });

    const baseClass = "animate-in fade-in slide-in-from-bottom-1 duration-200";

    switch (type) {
      // Layout
      case "Card":
        return (
          <div key={element.key} className={`border border-border rounded-lg p-3 bg-background ${baseClass}`}>
            {props.title && <div className="font-semibold text-sm mb-1">{props.title as string}</div>}
            {props.description && <div className="text-[10px] text-muted-foreground mb-2">{props.description as string}</div>}
            <div className="space-y-2">{renderChildren()}</div>
          </div>
        );
      case "Stack":
        const isHorizontal = props.direction === "horizontal";
        const stackGap = props.gap === "lg" ? "gap-3" : props.gap === "sm" ? "gap-1" : "gap-2";
        return (
          <div key={element.key} className={`flex ${isHorizontal ? "flex-row items-center" : "flex-col"} ${stackGap} ${baseClass}`}>
            {renderChildren()}
          </div>
        );
      case "Grid":
        const cols = props.columns === 4 ? "grid-cols-4" : props.columns === 3 ? "grid-cols-3" : "grid-cols-2";
        const gridGap = props.gap === "lg" ? "gap-3" : props.gap === "sm" ? "gap-1" : "gap-2";
        return (
          <div key={element.key} className={`grid ${cols} ${gridGap} ${baseClass}`}>
            {renderChildren()}
          </div>
        );
      case "Divider":
        return <hr key={element.key} className={`border-border my-2 ${baseClass}`} />;

      // Form Inputs
      case "Input":
        return (
          <div key={element.key} className={baseClass}>
            {props.label && <label className="text-[10px] text-muted-foreground block mb-0.5">{props.label as string}</label>}
            <div className="h-7 w-full bg-card border border-border rounded px-2 text-xs flex items-center text-muted-foreground/50">
              {props.placeholder as string || ""}
            </div>
          </div>
        );
      case "Textarea":
        const rows = (props.rows as number) || 3;
        return (
          <div key={element.key} className={baseClass}>
            {props.label && <label className="text-[10px] text-muted-foreground block mb-0.5">{props.label as string}</label>}
            <div className={`w-full bg-card border border-border rounded px-2 py-1 text-xs text-muted-foreground/50`} style={{ minHeight: rows * 16 }}>
              {props.placeholder as string || ""}
            </div>
          </div>
        );
      case "Select":
        return (
          <div key={element.key} className={baseClass}>
            {props.label && <label className="text-[10px] text-muted-foreground block mb-0.5">{props.label as string}</label>}
            <div className="h-7 w-full bg-card border border-border rounded px-2 text-xs flex items-center justify-between text-muted-foreground/50">
              <span>{props.placeholder as string || "Select..."}</span>
              <span>v</span>
            </div>
          </div>
        );
      case "Checkbox":
        return (
          <label key={element.key} className={`flex items-center gap-2 text-xs ${baseClass}`}>
            <div className={`w-3.5 h-3.5 border border-border rounded-sm ${props.checked ? "bg-foreground" : "bg-card"}`} />
            {props.label as string}
          </label>
        );
      case "Radio":
        const options = (props.options as string[]) || [];
        return (
          <div key={element.key} className={`space-y-1 ${baseClass}`}>
            {props.label && <div className="text-[10px] text-muted-foreground mb-1">{props.label as string}</div>}
            {options.map((opt, i) => (
              <label key={i} className="flex items-center gap-2 text-xs">
                <div className={`w-3.5 h-3.5 border border-border rounded-full ${i === 0 ? "bg-foreground" : "bg-card"}`} />
                {opt}
              </label>
            ))}
          </div>
        );
      case "Switch":
        return (
          <label key={element.key} className={`flex items-center justify-between gap-2 text-xs ${baseClass}`}>
            <span>{props.label as string}</span>
            <div className={`w-8 h-4 rounded-full relative ${props.checked ? "bg-foreground" : "bg-border"}`}>
              <div className={`absolute w-3 h-3 rounded-full bg-background top-0.5 transition-all ${props.checked ? "right-0.5" : "left-0.5"}`} />
            </div>
          </label>
        );

      // Actions
      case "Button":
        const variant = props.variant as string;
        const btnClass = variant === "danger" ? "bg-red-500 text-white" : variant === "secondary" ? "bg-card border border-border text-foreground" : "bg-foreground text-background";
        return (
          <button key={element.key} onClick={handleAction} className={`px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 transition-opacity ${btnClass} ${baseClass}`}>
            {props.label as string}
          </button>
        );
      case "Link":
        return (
          <span key={element.key} className={`text-xs text-blue-500 underline cursor-pointer ${baseClass}`}>
            {props.label as string}
          </span>
        );

      // Typography
      case "Heading":
        const level = (props.level as number) || 2;
        const headingClass = level === 1 ? "text-lg font-bold" : level === 3 ? "text-xs font-semibold" : level === 4 ? "text-[10px] font-semibold" : "text-sm font-semibold";
        return <div key={element.key} className={`${headingClass} ${baseClass}`}>{props.text as string}</div>;
      case "Text":
        const textVariant = props.variant as string;
        const textClass = textVariant === "caption" ? "text-[10px]" : textVariant === "muted" ? "text-xs text-muted-foreground" : "text-xs";
        return <p key={element.key} className={`${textClass} ${baseClass}`}>{props.content as string}</p>;

      // Data Display
      case "Image":
        return (
          <div key={element.key} className={`bg-card border border-border rounded flex items-center justify-center text-[10px] text-muted-foreground ${baseClass}`} style={{ width: (props.width as number) || 80, height: (props.height as number) || 60 }}>
            {props.alt as string || "img"}
          </div>
        );
      case "Avatar":
        const name = props.name as string || "?";
        const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
        const avatarSize = props.size === "lg" ? "w-10 h-10 text-sm" : props.size === "sm" ? "w-6 h-6 text-[8px]" : "w-8 h-8 text-[10px]";
        return (
          <div key={element.key} className={`${avatarSize} rounded-full bg-muted flex items-center justify-center font-medium ${baseClass}`}>
            {initials}
          </div>
        );
      case "Badge":
        const badgeVariant = props.variant as string;
        const badgeClass = badgeVariant === "success" ? "bg-green-100 text-green-800" : badgeVariant === "warning" ? "bg-yellow-100 text-yellow-800" : badgeVariant === "danger" ? "bg-red-100 text-red-800" : "bg-muted text-foreground";
        return <span key={element.key} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeClass} ${baseClass}`}>{props.text as string}</span>;
      case "Alert":
        const alertType = props.type as string;
        const alertClass = alertType === "success" ? "bg-green-50 border-green-200" : alertType === "warning" ? "bg-yellow-50 border-yellow-200" : alertType === "error" ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200";
        return (
          <div key={element.key} className={`p-2 rounded border ${alertClass} ${baseClass}`}>
            <div className="text-xs font-medium">{props.title as string}</div>
            {props.message && <div className="text-[10px] mt-0.5">{props.message as string}</div>}
          </div>
        );
      case "Progress":
        const value = Math.min(100, Math.max(0, (props.value as number) || 0));
        return (
          <div key={element.key} className={baseClass}>
            {props.label && <div className="text-[10px] text-muted-foreground mb-1">{props.label as string}</div>}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-foreground rounded-full transition-all" style={{ width: `${value}%` }} />
            </div>
          </div>
        );
      case "Rating":
        const ratingValue = (props.value as number) || 0;
        const maxRating = (props.max as number) || 5;
        return (
          <div key={element.key} className={baseClass}>
            {props.label && <div className="text-[10px] text-muted-foreground mb-1">{props.label as string}</div>}
            <div className="flex gap-0.5">
              {Array.from({ length: maxRating }).map((_, i) => (
                <span key={i} className={`text-sm ${i < ratingValue ? "text-yellow-400" : "text-muted"}`}>*</span>
              ))}
            </div>
          </div>
        );

      // Fallback for Form type (legacy)
      case "Form":
        return (
          <div key={element.key} className={`border border-border rounded-lg p-3 bg-background ${baseClass}`}>
            {props.title && <div className="font-semibold text-sm mb-2">{props.title as string}</div>}
            <div className="space-y-2">{renderChildren()}</div>
          </div>
        );

      default:
        return <div key={element.key} className={`text-[10px] text-muted-foreground ${baseClass}`}>[{type}]</div>;
    }
  };

  // Render preview from tree
  const renderPreview = () => {
    const currentTree = mode === "simulation" ? currentSimulationStage?.tree : tree;

    if (!currentTree || !currentTree.root || !currentTree.elements[currentTree.root]) {
      return <div className="text-muted-foreground/50 text-sm">{isLoading ? "generating..." : "waiting..."}</div>;
    }

    const root = currentTree.elements[currentTree.root];
    if (!root) return null;

    return (
      <div className="text-center animate-in fade-in duration-200 w-full max-w-[240px]">
        {renderElement(root, currentTree.elements)}
        {actionFired && (
          <div className="mt-3 text-xs font-mono text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
            onAction()
          </div>
        )}
      </div>
    );
  };

  const currentTree = mode === "simulation" ? currentSimulationStage?.tree : tree;
  const jsonCode = currentTree ? JSON.stringify(currentTree, null, 2) : "// waiting...";

  const isTypingSimulation = mode === "simulation" && phase === "typing";
  const isStreamingSimulation = mode === "simulation" && phase === "streaming";
  const showLoadingDots = isStreamingSimulation || isLoading;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Prompt input */}
      <div className="mb-6">
        <div className="border border-border rounded p-3 bg-card font-mono text-sm min-h-[44px] flex items-center justify-between">
          {mode === "simulation" ? (
            <div className="flex items-center flex-1">
              <span className="inline-flex items-center h-5">{typedPrompt}</span>
              {isTypingSimulation && (
                <span className="inline-block w-2 h-4 bg-foreground ml-0.5 animate-pulse" />
              )}
            </div>
          ) : (
            <form
              className="flex items-center flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <input
                type="text"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Describe what you want to build..."
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50"
                disabled={isLoading}
                maxLength={140}
                autoFocus
              />
            </form>
          )}
          {(mode === "simulation" || isLoading) ? (
            <button
              onClick={stopGeneration}
              className="ml-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Stop"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none"
              >
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!userPrompt.trim()}
              className="ml-2 p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              aria-label="Submit"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M19 12l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Try: &quot;Create a login form&quot; or &quot;Build a feedback form with rating&quot;
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Tabbed code/stream/json panel */}
        <div>
          <div className="flex gap-4 mb-2">
            {(["json", "stream", "code"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-mono transition-colors ${
                  activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="border border-border rounded p-3 bg-card font-mono text-xs h-96 overflow-auto text-left">
            {activeTab === "stream" && (
              <div className="space-y-1">
                {streamLines.map((line, i) => (
                  <div
                    key={i}
                    className="text-muted-foreground truncate animate-in fade-in slide-in-from-bottom-1 duration-200"
                  >
                    {line}
                  </div>
                ))}
                {showLoadingDots && (
                  <div className="flex gap-1 mt-2">
                    <span className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" />
                    <span className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse [animation-delay:75ms]" />
                    <span className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse [animation-delay:150ms]" />
                  </div>
                )}
                {streamLines.length === 0 && !showLoadingDots && (
                  <div className="text-muted-foreground/50">waiting...</div>
                )}
              </div>
            )}
            <div className={activeTab === "json" ? "" : "hidden"}>
              <CodeBlock code={jsonCode} lang="json" />
            </div>
            <div className={activeTab === "code" ? "" : "hidden"}>
              <CodeBlock code={CODE_EXAMPLE} lang="tsx" />
            </div>
          </div>
        </div>

        {/* Rendered output */}
        <div>
          <div className="text-xs text-muted-foreground mb-2 font-mono">render</div>
          <div className="border border-border rounded p-3 bg-card h-96 flex items-center justify-center">
            {renderPreview()}
          </div>
        </div>
      </div>
    </div>
  );
}
