import { useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';

import api, { extractErrorMessage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import StatusBadge from '@/components/shared/StatusBadge';
import FingerprintScanner, { type ScannerState } from '@/components/shared/FingerprintScanner';
import { captureFingerprint, discoverDevice, RdServiceError, type RdDeviceInfo } from '@/lib/rdService';
import type { BiometricDeviceStatus, BiometricHand, BiometricRecord } from '@/types';
import type { WizardStepProps } from './types';

interface BiometricStepProps extends WizardStepProps {
  hand: BiometricHand;
}

export default function BiometricStep({ candidateId, hand, onSaved, goNext }: BiometricStepProps) {
  const toast = useToast();
  const [deviceStatus, setDeviceStatus] = useState<BiometricDeviceStatus | null>(null);
  const [record, setRecord] = useState<BiometricRecord | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Real RD Service device (Mantra MFS110). Only used when the backend is
  // configured with BIOMETRIC_PROVIDER=rdservice — the device lives on this
  // machine, so discovery happens here rather than server-side.
  const [rdDevice, setRdDevice] = useState<RdDeviceInfo | null>(null);
  const [rdError, setRdError] = useState<string>('');
  const [detectingDevice, setDetectingDevice] = useState(false);

  // Drives the on-screen scanner animation the candidate watches during capture.
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  // Details of the capture that just completed, shown as visible proof.
  const [lastCapture, setLastCapture] = useState<{
    qualityScore: number;
    deviceModel?: string;
    deviceSerial?: string;
  } | null>(null);

  const handLabel = hand === 'LEFT_HAND' ? 'Left Hand' : 'Right Hand';
  const isRdService = deviceStatus?.provider === 'rdservice';

  const load = async () => {
    try {
      const [statusRes, recordsRes] = await Promise.all([
        api.get('/biometric/device-status'),
        api.get(`/candidates/${candidateId}/biometric`),
      ]);
      setDeviceStatus(statusRes.data.data);
      setRecord(recordsRes.data.data.find((r: BiometricRecord) => r.hand === hand) || null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load biometric status'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId, hand]);

  /** Probes 127.0.0.1 for a running RD Service once we know we're in rdservice mode. */
  const detectDevice = async () => {
    setDetectingDevice(true);
    setRdError('');
    try {
      setRdDevice(await discoverDevice());
    } catch (err) {
      setRdDevice(null);
      setRdError(err instanceof RdServiceError ? err.message : 'Could not detect a fingerprint scanner.');
    } finally {
      setDetectingDevice(false);
    }
  };

  useEffect(() => {
    if (isRdService) detectDevice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRdService]);

  // Ticks down the visible capture window while the device waits for a finger.
  useEffect(() => {
    if (scannerState !== 'scanning' || secondsRemaining <= 0) return undefined;
    const timer = setTimeout(() => setSecondsRemaining((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [scannerState, secondsRemaining]);

  const capture = async () => {
    setCapturing(true);
    setRdError('');
    setLastCapture(null);
    setScannerState('scanning');
    // Mirrors the CAPTURE_TIMEOUT_MS the RD Service call is given, so the
    // countdown the candidate sees matches the device's real capture window.
    setSecondsRemaining(isRdService ? 30 : 0);

    try {
      let clientCapture;

      if (isRdService) {
        // Capture on the local device, then relay only the result. The PID
        // block is hashed server-side and never stored.
        const device = rdDevice ?? (await discoverDevice());
        setRdDevice(device);
        clientCapture = await captureFingerprint(device);
        setLastCapture({
          qualityScore: clientCapture.qualityScore,
          deviceModel: clientCapture.deviceModel,
          deviceSerial: clientCapture.deviceSerial,
        });
      }

      await api.post(`/candidates/${candidateId}/biometric/capture`, { hand, clientCapture });
      setScannerState('success');
      toast.success(`${handLabel} fingerprint captured`);
      await load();
    } catch (err) {
      setScannerState('error');
      if (err instanceof RdServiceError) {
        setRdError(err.message);
        toast.error(err.message);
      } else {
        toast.error(extractErrorMessage(err, 'Capture failed'));
      }
    } finally {
      setCapturing(false);
      setSecondsRemaining(0);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const qualityScore = record ? Number(record.quality_score) : 0;

  return (
    <div>
      <h2>{handLabel} Biometric Capture</h2>
      {isRdService ? (
        <p className="mb-5 text-sm text-muted-foreground">
          Place the candidate&apos;s {handLabel.toLowerCase()} finger on the scanner, then press Capture. Only a
          one-way reference and quality score are stored — never the fingerprint itself.
        </p>
      ) : (
        <p className="mb-5 text-sm text-muted-foreground">
          Provider:{' '}
          <strong className="text-foreground">
            {deviceStatus?.provider === 'mock' ? 'Simulated (Mock)' : deviceStatus?.provider}
          </strong>{' '}
          — this is a development/demo capture, not a real fingerprint scan.
        </p>
      )}

      <Card className="mb-4 max-w-md">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2">
            {isRdService ? (
              <Badge variant={rdDevice ? 'success' : 'destructive'}>
                {detectingDevice ? 'Detecting…' : rdDevice ? 'Scanner Connected' : 'Scanner Not Detected'}
              </Badge>
            ) : (
              <Badge variant={deviceStatus?.connected ? 'success' : 'destructive'}>
                {deviceStatus?.connected ? 'Device Connected' : 'Device Not Connected'}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {isRdService ? rdDevice?.info || 'Mantra MFS110 (RD Service)' : deviceStatus?.deviceName}
          </div>
          {isRdService && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={detectDevice}
              disabled={detectingDevice || capturing}
            >
              {detectingDevice ? 'Detecting…' : 'Re-detect Scanner'}
            </Button>
          )}
        </CardContent>
      </Card>

      {rdError && (
        <Alert variant="destructive" className="mb-4 max-w-md">
          <AlertDescription>{rdError}</AlertDescription>
        </Alert>
      )}

      {/* Live scanner indicator — what the candidate watches during the scan. */}
      <Card className="mb-4 max-w-md">
        <CardContent className="flex flex-col items-center p-6">
          <FingerprintScanner
            state={scannerState === 'idle' && record ? 'success' : scannerState}
            secondsRemaining={secondsRemaining}
          />

          {(record || lastCapture) && scannerState !== 'scanning' && (
            <div className="mt-6 w-full border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between">
                <strong className="text-sm">{handLabel} Capture Recorded</strong>
                {record && <StatusBadge status={record.verification_status} />}
              </div>

              <div className="mb-1.5 text-sm text-muted-foreground">Scan Quality</div>
              <Progress value={lastCapture?.qualityScore ?? qualityScore} className="mb-1.5" />
              <div className="mb-3 text-sm tabular-nums text-muted-foreground">
                {lastCapture?.qualityScore ?? qualityScore} / 100
              </div>

              {/* Device provenance — visible evidence of which scanner was used. */}
              {(lastCapture?.deviceModel || record?.device_info) && (
                <dl className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-3">
                    <dt>Scanner</dt>
                    <dd className="text-right font-medium text-foreground">
                      {lastCapture?.deviceModel ?? record?.device_info}
                    </dd>
                  </div>
                  {lastCapture?.deviceSerial && (
                    <div className="flex justify-between gap-3">
                      <dt>Serial</dt>
                      <dd className="text-right font-mono text-foreground">{lastCapture.deviceSerial}</dd>
                    </div>
                  )}
                  {record?.captured_at && (
                    <div className="flex justify-between gap-3">
                      <dt>Captured</dt>
                      <dd className="text-right text-foreground">
                        {new Date(record.captured_at).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          )}

          {!record && !lastCapture && scannerState === 'idle' && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              No capture recorded yet for {handLabel.toLowerCase()}.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mb-5 flex gap-2">
        <Button
          type="button"
          onClick={capture}
          disabled={capturing || detectingDevice || (isRdService && !rdDevice)}
        >
          <Fingerprint className="h-4 w-4" />
          {capturing
            ? isRdService
              ? 'Place finger on scanner…'
              : 'Capturing…'
            : record
              ? 'Re-capture'
              : 'Capture Biometric'}
        </Button>
      </div>

      <div className="flex justify-between border-t border-border pt-5">
        <span />
        <Button
          type="button"
          onClick={async () => {
            await onSaved();
            goNext();
          }}
          disabled={!record}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
