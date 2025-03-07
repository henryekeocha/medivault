export interface Finding {
  type: 'anomaly' | 'measurement' | 'classification';
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestedAction?: string;
}

export interface AnalysisResult {
  findings: Finding[];
  confidence: number;
  processingTime: number;
  modelVersion: string;
}

export interface AnalysisRecord {
  id: string;
  createdAt: string;
  details: {
    findings: number;
    modelVersion: string;
    processingTime: number;
  };
}

export type SeverityType = 'low' | 'medium' | 'high';
export type SeverityColor = 'error' | 'warning' | 'info' | 'default'; 