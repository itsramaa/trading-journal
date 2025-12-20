import { useState } from "react";
import { Download, Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ImportExportDialogProps {
  title: string;
  description?: string;
  exportData: () => Promise<Record<string, unknown>[]>;
  importData: (data: Record<string, unknown>[]) => Promise<void>;
  exportFilename: string;
  templateFields: string[];
  children?: React.ReactNode;
}

export function ImportExportDialog({
  title,
  description,
  exportData,
  importData,
  exportFilename,
  templateFields,
  children,
}: ImportExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      const data = await exportData();
      
      if (data.length === 0) {
        toast.info("No data to export");
        return;
      }

      const csv = convertToCSV(data);
      downloadCSV(csv, `${exportFilename}-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success(`Exported ${data.length} records`);
    } catch (error) {
      toast.error("Failed to export data");
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      setExporting(true);
      const data = await exportData();
      
      if (data.length === 0) {
        toast.info("No data to export");
        return;
      }

      const json = JSON.stringify(data, null, 2);
      downloadFile(json, `${exportFilename}-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      toast.success(`Exported ${data.length} records`);
    } catch (error) {
      toast.error("Failed to export data");
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setImportResult(null);

      const text = await file.text();
      let data: Record<string, unknown>[];

      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        data = parseCSV(text);
      } else {
        throw new Error("Unsupported file format. Please use CSV or JSON.");
      }

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No valid data found in file");
      }

      await importData(data);
      setImportResult({ success: true, message: `Successfully imported ${data.length} records` });
      toast.success(`Imported ${data.length} records`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import data";
      setImportResult({ success: false, message });
      toast.error(message);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const csv = templateFields.join(',') + '\n';
    downloadCSV(csv, `${exportFilename}-template.csv`);
    toast.success("Template downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import / Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Tabs defaultValue="export" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Export your data to CSV or JSON format for backup or analysis.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleExport} disabled={exporting} className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                {exporting ? "Exporting..." : "Export CSV"}
              </Button>
              <Button onClick={handleExportJSON} disabled={exporting} variant="outline" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                {exporting ? "Exporting..." : "Export JSON"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Import data from a CSV or JSON file. Make sure your file matches the expected format.
            </p>

            <div className="space-y-3">
              <Label htmlFor="file-upload">Select file</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                disabled={importing}
              />
            </div>

            <Button onClick={downloadTemplate} variant="link" className="px-0 text-sm">
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>

            {importResult && (
              <Alert variant={importResult.success ? "default" : "destructive"}>
                {importResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{importResult.message}</AlertDescription>
              </Alert>
            )}

            {importing && (
              <p className="text-sm text-muted-foreground">Importing...</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Utility functions
function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      const strValue = String(value);
      // Escape quotes and wrap in quotes if contains comma or newline
      if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  const data: Record<string, unknown>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      let value: unknown = values[index] ?? '';
      // Try to parse numbers
      if (value !== '' && !isNaN(Number(value))) {
        value = Number(value);
      }
      // Try to parse JSON
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        try {
          value = JSON.parse(value);
        } catch { /* keep as string */ }
      }
      row[header] = value;
    });
    data.push(row);
  }
  
  return data;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

function downloadCSV(content: string, filename: string) {
  downloadFile(content, filename, 'text/csv;charset=utf-8;');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
