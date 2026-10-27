export async function saveReport(bytes: ArrayBuffer, sessionId: string): Promise<string> {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `photometrix-${sessionId.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'Report download started. Check your downloads.';
}
