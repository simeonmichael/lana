"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from "@/components/ui";
import { QrCode, Search, Shield } from "lucide-react";
import { useErrorToast } from "@/components/ui/toast";

export default function VerifyPage() {
  const router = useRouter();
  const [certificateNumber, setCertificateNumber] = React.useState("");
  const [isScanning, setIsScanning] = React.useState(false);
  const scannerRef = React.useRef<{ stop: () => Promise<void> } | null>(null);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const showErrorToast = useErrorToast();

  const handleManualVerify = () => {
    if (certificateNumber.trim()) {
      router.push(`/verify/${certificateNumber.trim()}`);
    }
  };

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setScanError(null);

      // Dynamically import html5-qrcode
      const { Html5Qrcode } = await import("html5-qrcode");
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Extract certificate number from URL if it's a full URL
          const match = decodedText.match(/\/verify\/([^\/]+)/);
          const certNumber = match ? match[1] : decodedText;

          stopScanning();
          router.push(`/verify/${certNumber}`);
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      );
    } catch (err) {
      console.error("QR scanning error:", err);

      const errorName = (err as { name?: string })?.name;
      const isNotFoundError = errorName === "NotFoundError";

      const friendlyMessage = isNotFoundError
        ? "No camera was found on this device. Try connecting a camera or switching to a different device."
        : "We couldn't access your camera. Please check your browser permissions and try again.";

      setScanError(friendlyMessage);
      showErrorToast("Unable to start camera", friendlyMessage);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current = null;
          setIsScanning(false);
        })
        .catch((err: unknown) => {
          console.error("Stop scanning error:", err);
          setIsScanning(false);
        });
    }
  };

  React.useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="bg-muted/30 min-h-screen py-8">
      <div className="mx-auto max-w-2xl space-y-6 px-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-foreground mb-2 text-3xl font-bold">Verify Certificate</h1>
          <p className="text-muted-foreground">
            Verify the authenticity of a certificate by scanning the QR code or entering the
            certificate number
          </p>
        </div>

        {/* Manual Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="text-primary h-5 w-5" />
              Enter Certificate Number
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter certificate number (e.g., LANA-XXXXX-XXXXX)"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualVerify();
                  }
                }}
              />
              <Button onClick={handleManualVerify} disabled={!certificateNumber.trim()}>
                Verify
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="text-primary h-5 w-5" />
              Scan QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isScanning ? (
              <div className="py-8 text-center">
                <div className="bg-primary/10 mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full">
                  <QrCode className="text-primary h-12 w-12" />
                </div>
                <p className="text-muted-foreground mb-4">
                  Click the button below to start scanning the QR code on the certificate
                </p>
                <Button onClick={startScanning} leftIcon={<QrCode className="h-4 w-4" />}>
                  Start Scanning
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div id="qr-reader" className="w-full" />
                {scanError && (
                  <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3">
                    <p className="text-destructive text-sm">{scanError}</p>
                  </div>
                )}
                <Button onClick={stopScanning} variant="outline" fullWidth>
                  Stop Scanning
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-tertiary/30 p-4">
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 flex items-center justify-center rounded-full p-1">
                <Shield className="text-primary h-6 w-6" />
              </div>
              <div>
                <h3 className="text-foreground mb-2 font-semibold">
                  About Certificate Verification
                </h3>
                <p className="text-muted-foreground text-sm">
                  All certificates issued by LANA are verified and authenticated. You can verify any
                  certificate by scanning its QR code or entering the certificate number. Verified
                  certificates are recognized by the Ministry of Technical and Higher Education and
                  the Ministry of Communication and Technology Information, Republic of Sierra
                  Leone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
