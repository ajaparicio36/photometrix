import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { fail } from '../http';
import type { DomainService } from './domain.service';

@Injectable()
export class ReportService {
  async create(
    session: Awaited<ReturnType<DomainService['getSession']>>,
  ): Promise<Buffer> {
    if (session.status !== 'completed' || !session.summary)
      fail(
        409,
        'REPORT_NOT_READY',
        'Stop the session before downloading its report',
      );
    const summary = session.summary;
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Photometrix illuminance assessment',
          Author: 'Photometrix',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: unknown) => {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk);
      });
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.fontSize(22).text('PHOTOMETRIX');
      doc.fontSize(14).text('Lighting illuminance session report').moveDown();
      const lines = [
        `Session: ${session.id}`,
        `Room: ${session.roomSnapshot.name}`,
        `Category: ${session.roomSnapshot.category}`,
        `Room target: ${session.roomSnapshot.targetLux} lx`,
        `Module: ${session.moduleSnapshot.name} (${session.moduleId})`,
        `Started: ${session.startedAt.toISOString()}`,
        `Stopped: ${session.stoppedAt?.toISOString() ?? 'Unavailable'}`,
        `Measurement points: sensor 1/channel 0, sensor 2/channel 1, sensor 3/channel 2`,
        `Placement: ${session.placementNotes ?? 'Not documented'}`,
        `Samples: ${summary.totalSampleCount} total; ${summary.completeSampleCount} complete; ${summary.incompleteSampleCount} incomplete`,
        `First acquisition: ${summary.firstSampledAt ?? 'No samples'}`,
        `Last acquisition: ${summary.lastSampledAt ?? 'No samples'}`,
        `Session mean: ${summary.sessionAverageLux === null ? 'Insufficient data' : `${summary.sessionAverageLux.toFixed(1)} lx`}`,
        `Assessment: ${summary.assessment === 'meets_target' ? 'Meets room target' : summary.assessment === 'below_target' ? 'Below room target' : 'Insufficient data'}`,
        'Method: arithmetic mean of complete three-channel sample means; incomplete samples excluded.',
        'Cadence: nominal 10 seconds. Missing intervals are not reconstructed; consult raw session history for gaps and receipt times.',
        ...summary.recommendations,
        'Historical room target and names are preserved. This report is decision support, not standards certification or an energy audit.',
        'Physical wiring, sensor accuracy and calibration require reference-meter validation. Software/API simulation does not validate hardware.',
      ];
      doc.fontSize(10);
      for (const line of lines)
        doc.text(line.replace(/\p{Cc}/gu, '')).moveDown(0.5);
      doc.end();
    });
  }
}
