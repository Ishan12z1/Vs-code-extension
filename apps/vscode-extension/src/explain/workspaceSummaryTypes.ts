/**
 * Small view-model types for the read-only workspace explanation UI.
 *
 * Keep this separate from the raw WorkspaceSnapshot contract.
 * The snapshot is machine-oriented.
 * The summary model is UI-oriented.
 */

export interface SummaryListItem{
    label:string;
    value:string;
    tone?: "neutral" | "good" | "warning" | "muted";    
}

export interface SummarySection{
    title:string;
    items:SummaryListItem[];
    emptyMessage?:string;

}

export interface WorkspaceSummaryViewModel{
    title: string;
    subtitle: string;
    sections: SummarySection[];
}