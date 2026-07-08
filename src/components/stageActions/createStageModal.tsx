'use client';

import { useState, useCallback, useEffect, useRef } from "react";
import { ChainTemplate, StageTemplate } from "./createModalTemplates";
import { Spinner } from "../ui/spinner";
import { Modal } from "../common/modal";
import { Icon } from "../common/icon";
import { InfoTip } from "../common/info-tip";

interface CreateStageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (stage: Record<string, string>) => void;
    selectedTemplate?: ChainTemplate | null;
    stageIndex?: number;
    isBroadcasting?: boolean;
    chainTitle?: string; // Required to validate receiver sending
    carryFields?: CarryField[]; // canonical fields from earlier stages
}

interface MetadataField {
    id: string;
    key: string;
    value: string;
    placeholder?: string;
}

interface CarryField {
    key: string;
    lastValue: string;
}

export const CreateStageModal = ({ isOpen, onClose, onSubmit, selectedTemplate, stageIndex = 0, isBroadcasting = false, chainTitle = '', carryFields }: CreateStageModalProps) => {
    const [title, setTitle] = useState("");
    const [imageURL, setImageURL] = useState("");
    const [receiverPubKey, setReceiverPubKey] = useState("");
    const [handOff, setHandOff] = useState(false);
    const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Use character limit hook for all inputs
    const { validateInput, hasWarning, getWarning, getWarningCount } = useCharacterLimit(100);

    // Get suggested stages from selected template
    const suggestedStages = selectedTemplate?.stages || [];

    // On open: auto-fill the title with the next stage number, and carry the
    // canonical fields from earlier stages (same field names, empty values,
    // with the last value shown as a placeholder reminder).
    useEffect(() => {
        if (!isOpen) return;
        setTitle((prev) => prev || `Stage ${stageIndex + 1}`);
        if (carryFields && carryFields.length > 0) {
            setMetadataFields((prev) =>
                prev.length > 0
                    ? prev
                    : carryFields.map((f, i) => ({
                          id: `carry-${i}-${f.key}`,
                          key: f.key,
                          value: "",
                          placeholder: f.lastValue,
                      })),
            );
        }
    }, [isOpen, stageIndex, carryFields]);

    const applyTemplate = (stageTemplate: StageTemplate) => {
        setTitle(stageTemplate.name);
        const newFields: MetadataField[] = stageTemplate.keys.map((key: string, index: number) => ({
            id: `${Date.now()}-${index}`,
            key,
            value: ""
        }));
        setMetadataFields(newFields);
        setShowTemplates(false);
    };

    const addMetadataField = () => {
        const newField: MetadataField = {
            id: Date.now().toString(),
            key: "",
            value: ""
        };
        setMetadataFields([...metadataFields, newField]);
    };

    const removeMetadataField = (id: string) => {
        setMetadataFields(metadataFields.filter(field => field.id !== id));
    };

    const updateMetadataField = (id: string, key: string, value: string) => {
        // Validate and limit key and value to 100 characters
        const sanitizedKey = validateInput(key, `metadata-key-${id}`);
        const sanitizedValue = validateInput(value, `metadata-value-${id}`);

        setMetadataFields(metadataFields.map(field =>
            field.id === id ? { ...field, key: sanitizedKey, value: sanitizedValue } : field
        ));
    };

    const resetForm = () => {
        setMetadataFields([]);
        setTitle("");
        setImageURL("");
        setReceiverPubKey("");
        setHandOff(false);
        setShowTemplates(false);
        setUploadError(null);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError(null);
        setIsUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");
            setImageURL(data.url);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setIsUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Convert metadata fields to JSON object and include title and imageURL
        const metadataObject: Record<string, string> = {
            title: title
        };
        if (imageURL) {
            metadataObject.imageURL = imageURL;
        }
        if (handOff && receiverPubKey.trim()) {
            metadataObject.receiverPubKey = receiverPubKey.trim();
        }
        metadataFields.forEach(field => {
            if (field.key && field.value) {
                metadataObject[field.key] = field.value;
            }
        });

        // Call the onSubmit callback with the stage data
        onSubmit(metadataObject);

        // Reset form and close modal
        setTitle("");
        setImageURL("");
        setReceiverPubKey("");
        setHandOff(false);
        setMetadataFields([]);
        setShowTemplates(false);
        setIsSubmitting(false);
        onClose();
    };

    const FORM_ID = "create-stage-form";
    const receiverNeedsTitle = handOff && receiverPubKey.trim().length > 0 && chainTitle.trim().length === 0;
    const submitDisabled = isSubmitting || isBroadcasting || receiverNeedsTitle || getWarningCount() > 0;

    const footer = (
        <>
            {isBroadcasting ? (
                <span className="muted" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name="refresh" size={15} style={{ color: "var(--accent)" }} />
                    Writing the previous stage to the blockchain; this can take a few seconds…
                </span>
            ) : (
                <span className="faint" style={{ fontSize: 12 }}>
                    Recorded permanently{" "}
                    <InfoTip title="On-chain" body="Saved to the blockchain: permanent and publicly verifiable, not editable later.">on-chain</InfoTip>{" "}
                    once created.
                </span>
            )}
            <div style={{ display: "flex", gap: 10, flex: "0 0 auto" }}>
                <button type="button" className="btn btn-outline" onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                </button>
                <button type="submit" form={FORM_ID} className={`btn btn-primary${submitDisabled ? " is-disabled" : ""}`} disabled={submitDisabled}>
                    {isSubmitting ? (
                        <><Spinner size="sm" />Creating…</>
                    ) : isBroadcasting ? (
                        <><Icon name="refresh" size={15} />Broadcasting…</>
                    ) : (
                        <><Icon name="check" size={15} />Create stage</>
                    )}
                </button>
            </div>
        </>
    );

    return (
        <Modal
            open={isOpen}
            onClose={handleClose}
            icon="layers"
            title="Add a stage"
            sub="A step in your product's journey."
            footer={footer}
        >
            <form id={FORM_ID} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Stage title */}
                <div className="field">
                    <label className="label" htmlFor="title">Stage title</label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(validateInput(e.target.value, 'title'))}
                        placeholder="e.g. Harvest, Processing Plant, Customs, Retail"
                        className="input"
                        style={hasWarning('title') ? { borderColor: "var(--danger)" } : undefined}
                        required
                    />
                    {hasWarning('title') ? (
                        <span className="help" style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 5 }}>
                            <Icon name="alert-triangle" size={12} />{getWarning('title')}
                        </span>
                    ) : (
                        <span className="help">Name this step, e.g. Harvest, Customs, Retail.</span>
                    )}
                </div>

                {/* Custom data */}
                <div className="field">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <label className="label">
                            <InfoTip title="Custom data" align="left" body="Fields you add become this chain's standard set and carry into later stages to fill in again.">Custom data</InfoTip>
                        </label>
                        <button type="button" className="btn btn-soft btn-sm" onClick={addMetadataField}>
                            <Icon name="plus" size={14} />Add field
                        </button>
                    </div>
                    <span className="help" style={{ marginBottom: 2 }}>e.g. batch number, certificate, GPS, temperature.</span>
                    {metadataFields.some((f) => f.placeholder) && (
                        <span className="help" style={{ display: "flex", gap: 6, alignItems: "flex-start", color: "var(--ink-2)", marginBottom: 2 }}>
                            <Icon name="info" size={13} style={{ marginTop: 1, flex: "0 0 auto" }} />
                            Carried from earlier stages. The greyed value is the last stage&apos;s: keep it if it&apos;s constant (a product ID) or change it if it updates (a status).
                        </span>
                    )}

                    {metadataFields.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {metadataFields.map((field) => (
                                <div key={field.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                        <input
                                            type="text"
                                            value={field.key}
                                            onChange={(e) => updateMetadataField(field.id, e.target.value, field.value)}
                                            placeholder="Field name"
                                            className="input"
                                            style={{ flex: 1, ...(hasWarning(`metadata-key-${field.id}`) ? { borderColor: "var(--danger)" } : {}) }}
                                        />
                                        <input
                                            type="text"
                                            value={field.value}
                                            onChange={(e) => updateMetadataField(field.id, field.key, e.target.value)}
                                            placeholder={field.placeholder || "Value"}
                                            className="input"
                                            style={{ flex: 1.3, ...(hasWarning(`metadata-value-${field.id}`) ? { borderColor: "var(--danger)" } : {}) }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeMetadataField(field.id)}
                                            className="icon-btn"
                                            title="Remove field"
                                            aria-label="Remove field"
                                        >
                                            <Icon name="trash" size={15} />
                                        </button>
                                    </div>
                                    {(hasWarning(`metadata-key-${field.id}`) || hasWarning(`metadata-value-${field.id}`)) && (
                                        <span className="help" style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 5 }}>
                                            <Icon name="alert-triangle" size={12} />
                                            {hasWarning(`metadata-key-${field.id}`) ? getWarning(`metadata-key-${field.id}`) : getWarning(`metadata-value-${field.id}`)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Template suggestions */}
                    {suggestedStages.length > 0 && (
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowTemplates(!showTemplates)}
                                className="nav-link"
                                style={{ padding: "4px 0", color: "var(--accent)", fontSize: 12.5, fontWeight: 500 }}
                            >
                                <Icon name={showTemplates ? "chevron-down" : "chevron-right"} size={14} />
                                Suggested fields for this template
                            </button>
                            {showTemplates && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                                    {suggestedStages.map((stageTemplate, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => applyTemplate(stageTemplate)}
                                            className="card-flat"
                                            style={{ textAlign: "left", padding: "10px 12px", cursor: "pointer" }}
                                        >
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{stageTemplate.name}</div>
                                            <div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>
                                                Fields: {stageTemplate.keys.join(", ")}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Stage photo (optional, secondary) */}
                <div className="field">
                    <label className="label">Stage photo <span className="opt">· optional</span></label>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileSelect}
                        style={{ display: "none" }}
                    />
                    {imageURL ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", background: "var(--surface-2)" }}>
                            <div style={{ width: 64, height: 64, borderRadius: "var(--r-sm)", overflow: "hidden", flex: "0 0 auto", background: "var(--surface-3)", display: "grid", placeItems: "center" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imageURL} alt="Stage photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                            <div style={{ flex: 1 }} />
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={isUploading}>Replace</button>
                            <button type="button" className="icon-btn" onClick={() => setImageURL("")} title="Remove photo" aria-label="Remove stage photo">
                                <Icon name="x" size={15} />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="dashed"
                            onClick={() => fileRef.current?.click()}
                            disabled={isUploading}
                            style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: isUploading ? "wait" : "pointer", color: "var(--ink-2)" }}
                        >
                            {isUploading ? <Spinner size="sm" /> : <Icon name="upload" size={15} />}
                            <span style={{ fontWeight: 500, fontSize: 13 }}>{isUploading ? "Uploading…" : "Add a stage photo"}</span>
                        </button>
                    )}
                    {uploadError && (
                        <span className="help" style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 5 }}>
                            <Icon name="alert-triangle" size={12} />{uploadError}
                        </span>
                    )}
                </div>

                {/* Hand off to another party (optional, at the bottom) */}
                <div className="field">
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                            type="button"
                            onClick={() => setHandOff((v) => !v)}
                            className="nav-link"
                            style={{ padding: "4px 0", color: "var(--accent)", fontSize: 13, fontWeight: 500 }}
                            aria-expanded={handOff}
                        >
                            <Icon name={handOff ? "chevron-down" : "chevron-right"} size={14} />
                            Hand off to another party
                        </button>
                        <InfoTip title="Hand off / custody" body="Locks this stage to another wallet so only they can continue. Leave it closed to keep the stage yourself." />
                    </div>
                    {handOff && (
                        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                            <input
                                id="receiverPubKey"
                                type="text"
                                value={receiverPubKey}
                                onChange={(e) => setReceiverPubKey(validateInput(e.target.value, 'receiverPubKey'))}
                                placeholder="Paste the recipient's wallet public key…"
                                className="input mono"
                                style={hasWarning('receiverPubKey') ? { borderColor: "var(--danger)" } : undefined}
                            />
                            {hasWarning('receiverPubKey') ? (
                                <span className="help" style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 5 }}>
                                    <Icon name="alert-triangle" size={12} />{getWarning('receiverPubKey')}
                                </span>
                            ) : (
                                <span className="help">Only their wallet can continue from here.</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Inline guards */}
                {getWarningCount() > 0 && (
                    <span className="help" style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon name="alert-triangle" size={13} />
                        Please fix {getWarningCount()} input validation {getWarningCount() === 1 ? 'error' : 'errors'} before creating.
                    </span>
                )}
                {receiverNeedsTitle && (
                    <span className="help" style={{ color: "var(--warn)", display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon name="alert-triangle" size={13} />
                        Add a product name before handing this stage to another party.
                    </span>
                )}
            </form>
        </Modal>
    );
};

// Custom hook for character limit validation
function useCharacterLimit(maxLength: number) {
    const [warnings, setWarnings] = useState<Map<string, string>>(new Map());
    const [timeouts, setTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());

    const validateInput = useCallback((value: string, inputId: string): string => {
        // Clear existing timeout for this input
        const existingTimeout = timeouts.get(inputId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Check if value exceeds limit
        if (value.length > maxLength) {
            const newWarnings = new Map(warnings);
            newWarnings.set(inputId, `Limited to ${maxLength} characters`);
            setWarnings(newWarnings);

            // Auto-clear warning after 3 seconds
            const newTimeout = setTimeout(() => {
                setWarnings(prev => {
                    const updated = new Map(prev);
                    updated.delete(inputId);
                    return updated;
                });
                setTimeouts(prev => {
                    const updated = new Map(prev);
                    updated.delete(inputId);
                    return updated;
                });
            }, 3000);

            const newTimeouts = new Map(timeouts);
            newTimeouts.set(inputId, newTimeout);
            setTimeouts(newTimeouts);

            // Return truncated value
            return value.slice(0, maxLength);
        }

        // Clear warning if it exists and value is within limit
        if (warnings.has(inputId)) {
            const newWarnings = new Map(warnings);
            newWarnings.delete(inputId);
            setWarnings(newWarnings);
        }

        return value;
    }, [maxLength, warnings, timeouts]);

    const hasWarning = useCallback((inputId: string): boolean => {
        return warnings.has(inputId);
    }, [warnings]);

    const getWarning = useCallback((inputId: string): string => {
        return warnings.get(inputId) || '';
    }, [warnings]);

    const clearWarning = useCallback((inputId: string) => {
        const existingTimeout = timeouts.get(inputId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        setWarnings(prev => {
            const updated = new Map(prev);
            updated.delete(inputId);
            return updated;
        });
        setTimeouts(prev => {
            const updated = new Map(prev);
            updated.delete(inputId);
            return updated;
        });
    }, [timeouts]);

    const getWarningCount = useCallback((): number => {
        return warnings.size;
    }, [warnings]);

    return { validateInput, hasWarning, getWarning, clearWarning, getWarningCount };
}
