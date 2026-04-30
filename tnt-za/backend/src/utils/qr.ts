import QRCode from 'qrcode';
import { join } from 'path';
import { mkdirSync, existsSync, writeFileSync } from 'fs';

const QR_DIR = join(process.cwd(), 'uploads', 'qr');

export async function generateQRCode(data: string, filename: string): Promise<string> {
  if (!existsSync(QR_DIR)) mkdirSync(QR_DIR, { recursive: true });

  const filePath = join(QR_DIR, `${filename}.png`);
  const url = `/uploads/qr/${filename}.png`;

  await QRCode.toFile(filePath, data, {
    width: 300,
    margin: 2,
    color: { dark: '#0D6B3D', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  });

  return url;
}

export async function generateQRDataURL(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 300,
    margin: 2,
    color: { dark: '#0D6B3D', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  });
}

// Generate printable label: QR code + text identifier
export async function generateLabel(identifier: string, type: 'plant' | 'container' | 'batch' | 'asset'): Promise<{ qrUrl: string; qrDataUrl: string }> {
  // QR encodes a URL that links to the entity in TnT-ZA
  const baseUrl = process.env.CORS_ORIGIN || 'https://tntilco.cleva-ai.co.za';
  const path = type === 'plant' ? 'plants' : type === 'container' ? 'containers' : 'batches';
  const scanData = `${baseUrl}/scan?id=${identifier}&type=${type}`;

  const qrUrl = await generateQRCode(scanData, identifier);
  const qrDataUrl = await generateQRDataURL(scanData);

  return { qrUrl, qrDataUrl };
}
