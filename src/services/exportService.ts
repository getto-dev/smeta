import { Estimate, EstimateItem, ESTIMATE_SCHEMA_VERSION } from '../types';
import { calculateEstimateTotals, calculateLineTotal } from '../domain/estimate/calculations';
import { formatQuantity } from '../utils/quantity';
import { isValidEstimate, MAX_ESTIMATE_ITEMS } from '../utils/validation';

/** Loads the heavy PDF exporter only when a PDF is actually requested. */
export async function generateAndDownloadVectorPDF(estimate: Estimate): Promise<string> {
  if (!isValidEstimate(estimate)) throw new Error('Нельзя экспортировать некорректную смету.');
  const { generateAndDownloadVectorPDF: generatePdf } = await import('./pdfExportService');
  return generatePdf(estimate);
}

/** Formats an integer amount stored in kopecks for display. */
export function formatCurrency(kopecks: number): string {
  const rubles = Math.round(kopecks || 0) / 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', minimumFractionDigits: rubles % 1 === 0 ? 0 : 2, maximumFractionDigits: 2,
  }).format(rubles);
}

export function formatDate(dateString: string): string {
  if (!dateString) return new Date().toLocaleDateString('ru-RU');
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateString; }
}

function money(kopecks: number): string { return formatCurrency(kopecks).replace(/\u00a0/g, ' '); }

export function getEstimateNumber(estimate: Estimate): string {
  const d = estimate.date ? new Date(estimate.date) : new Date();
  const year = isNaN(d.getTime()) ? new Date() : d;
  const yy = String(year.getFullYear()).slice(-2);
  const mm = String(year.getMonth() + 1).padStart(2, '0');
  const dd = String(year.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}-01`;
}

function parseEstimate(value: unknown): Estimate {
  if (!value || typeof value !== 'object') throw new Error('Некорректная структура файла сметы.');
  const raw = value as Partial<Estimate>;
  if (raw.schemaVersion !== ESTIMATE_SCHEMA_VERSION) throw new Error(`Неподдерживаемая версия сметы: ${String(raw.schemaVersion ?? 'не указана')}.`);
  if (!Array.isArray(raw.items) || raw.items.length > MAX_ESTIMATE_ITEMS) throw new Error('Файл содержит некорректный список позиций сметы.');
  const now = Date.now();
  const items: EstimateItem[] = raw.items.map((value, index) => {
    if (!value || typeof value !== 'object') throw new Error(`Позиция сметы #${index + 1} имеет неверный формат.`);
    const item = value as Partial<EstimateItem>;
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    const categoryId = typeof item.categoryId === 'string' ? item.categoryId.trim() : '';
    const category = typeof item.category === 'string' ? item.category.trim() : '';
    if (!item.id || typeof item.id !== 'string') throw new Error(`Позиция #${index + 1} не имеет id.`);
    if (!item.name || typeof item.name !== 'string') throw new Error(`Позиция #${index + 1} не имеет названия.`);
    if (!categoryId || !category) throw new Error(`Позиция #${index + 1} не имеет категории.`);
    if (!item.unit || typeof item.unit !== 'string') throw new Error(`Позиция #${index + 1} не имеет единицы измерения.`);
    if (!Number.isInteger(price) || price < 0) throw new Error(`Позиция #${index + 1} имеет неверную цену.`);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Позиция #${index + 1} имеет неверное количество.`);
    return { id: item.id, catalogId: typeof item.catalogId === 'string' ? item.catalogId : undefined, name: item.name.slice(0, 300), category: category.slice(0, 200), categoryId, unit: item.unit.slice(0, 50), price, quantity, total: calculateLineTotal(price, quantity), description: typeof item.description === 'string' ? item.description.slice(0, 1000) : undefined, type: item.type === 'material' ? 'material' : 'work' };
  });

  const estimate: Estimate = {
    schemaVersion: ESTIMATE_SCHEMA_VERSION,
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `est-${crypto.randomUUID()}`,
    title: typeof raw.title === 'string' ? raw.title.slice(0, 300) : '',
    customer: typeof raw.customer === 'string' ? raw.customer.slice(0, 300) : '',
    companyName: typeof raw.companyName === 'string' ? raw.companyName.slice(0, 300) : '',
    date: typeof raw.date === 'string' && raw.date ? raw.date : new Date().toISOString().split('T')[0],
    phone: typeof raw.phone === 'string' ? raw.phone.slice(0, 100) : '',
    address: typeof raw.address === 'string' ? raw.address.slice(0, 500) : '',
    notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 2000) : '',
    profileId: typeof raw.profileId === 'string' && raw.profileId ? raw.profileId : 'plumbing',
    profileName: typeof raw.profileName === 'string' ? raw.profileName : '',
    items,
    discount: Math.max(0, Math.min(100, Number(raw.discount) || 0)),
    subtotal: 0,
    servicesSubtotal: 0,
    materialsSubtotal: 0,
    total: 0,
    createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : now,
    updatedAt: now,
  };

  const totals = calculateEstimateTotals(items, estimate.discount);
  estimate.subtotal = totals.subtotal;
  estimate.servicesSubtotal = totals.servicesSum;
  estimate.materialsSubtotal = totals.productsSum;
  estimate.total = totals.grandTotal;

  if (!isValidEstimate(estimate)) throw new Error('Импортированная смета не прошла проверку данных.');
  return estimate;
}

/** Imports only the current canonical checknew estimate format. */
export async function importFromFile(file: File): Promise<Estimate> {
  const text = await file.text();
  const lowerName = file.name.toLowerCase();
  const isHtml = lowerName.endsWith('.html') || lowerName.endsWith('.htm') || text.trim().startsWith('<');
  if (!isHtml) {
    try { return parseEstimate(JSON.parse(text)); }
    catch (error) {
      if (error instanceof Error && error.message.includes('Неподдерживаемая версия сметы')) throw error;
      throw new Error('Файл не является корректной сметой checknew.');
    }
  }
  const match = text.match(/<script[^>]*id=["']smeta-app-data["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]) throw new Error('В HTML файле не найдены данные сметы checknew.');
  try { return parseEstimate(JSON.parse(match[1])); }
  catch (error) {
    if (error instanceof Error && error.message.includes('Неподдерживаемая версия сметы')) throw error;
    throw new Error('Не удалось прочитать данные сметы из HTML файла.');
  }
}

export const importFromJSON = importFromFile;

export function generateStandaloneHTML(estimate: Estimate): string {
  if (!isValidEstimate(estimate)) throw new Error('Нельзя экспортировать некорректную смету.');
  const docNumber = getEstimateNumber(estimate);
  const documentTitle = estimate.title?.trim() || `СЧЕТ №${docNumber}`;
  const objectParts: string[] = [];
  if (estimate.address?.trim()) objectParts.push(estimate.address.trim());
  if (estimate.customer?.trim()) objectParts.push(estimate.customer.trim());
  const objectAddress = objectParts.join(', ');
  const services = estimate.items.filter((item) => item.type !== 'material');
  const products = estimate.items.filter((item) => item.type === 'material');
  const totals = calculateEstimateTotals(estimate.items, estimate.discount);
  const servicesSum = totals.servicesSum;
  const productsSum = totals.productsSum;
  const discountPercent = totals.discountPercent;
  const discountAmount = totals.discountAmount;
  const grandTotal = totals.grandTotal;
  const sections = [
    { type: 'service', title: 'Наименование работ и услуг', items: services },
    { type: 'product', title: 'Наименование материалов и товаров', items: products },
  ].filter((section) => section.items.length > 0);
  const sectionsHtml = sections.map((section) => {
    const rowsHtml = section.items.map((item) => {
      const descHtml = item.description?.trim() ? `<div class="row-description">${escapeHtml(item.description.trim())}</div>` : '';
      const qty = `${formatQuantity(item.quantity)} ${item.unit}`;
      return `<div class="row"><div class="row-name"><div>${escapeHtml(item.name)}</div>${descHtml}</div><div class="row-values"><div>${escapeHtml(qty)}</div><div>${escapeHtml(money(item.price))}</div><div>${escapeHtml(money(calculateLineTotal(item.price, item.quantity)))}</div></div></div>`;
    }).join('\n');
    return `<div class="section"><div class="section-top-line"></div><div class="table-header"><div>${escapeHtml(section.title)}</div><div>Кол.</div><div>Цена</div><div>Сумма</div></div>${rowsHtml}</div>`;
  }).join('\n');
  const objectHtml = objectAddress ? `<span class="document-object">Объект: ${escapeHtml(objectAddress)}</span>` : '';
  const contractorHtml = estimate.companyName?.trim() || estimate.phone?.trim() ? `<div class="document-contractor">${estimate.companyName?.trim() ? `<span class="contractor-name">${escapeHtml(estimate.companyName.trim())}</span>` : ''}${estimate.phone?.trim() ? `<span class="contractor-phone">${escapeHtml(estimate.phone.trim())}</span>` : ''}</div>` : '';
  const showSectionSummary = services.length > 0 && products.length > 0;
  const summaryLines = showSectionSummary ? `<div class="summary-row"><span>Работы:</span><span>${escapeHtml(money(servicesSum))}</span></div><div class="summary-row"><span>Материалы:</span><span>${escapeHtml(money(productsSum))}</span></div>` : '';
  const discountHtml = discountAmount > 0 ? `<div class="summary-row"><span>Скидка ${discountPercent}%:</span><span>−${escapeHtml(money(discountAmount))}</span></div>` : '';
  const notesHtml = estimate.notes?.trim() ? `<div class="document-notes"><div class="notes-label">Примечания к смете:</div><div class="notes-text">${escapeHtml(estimate.notes.trim())}</div></div>` : '';
  const embeddedJson = JSON.stringify(estimate).replace(/<\/script/gi, '<\\/script');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(documentTitle)}${objectAddress ? ` — ${escapeHtml(objectAddress)}` : ''}</title><style>@page { size: A4; margin: 0; } * { box-sizing: border-box; } html, body { margin: 0; padding: 0; background: #fff; color: #23272b; } body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 8pt; } .estimate-page { width: 595.28px; min-height: 841.89px; margin: 0 auto; padding: 34px; background: #fff; position: relative; } .header-line { height: 2px; background: #2388c9; width: 100%; } .document-title { margin-top: 15px; margin-bottom: 13px; min-height: 13px; display: flex; align-items: baseline; justify-content: space-between; gap: 18px; } .document-title-left { display: flex; align-items: baseline; gap: 14px; overflow: hidden; } .document-number { font-size: 10pt; line-height: 10pt; font-weight: 700; color: #23272b; white-space: nowrap; } .document-object { font-size: 8pt; line-height: 10pt; color: #697078; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .document-contractor { font-size: 8pt; line-height: 10pt; color: #697078; text-align: right; white-space: nowrap; display: flex; gap: 8px; } .contractor-name { font-weight: 600; color: #23272b; } .section { margin: 0; } .section-top-line { height: 1px; background: #2388c9; width: 100%; } .table-header, .row { display: grid; grid-template-columns: 346px 55px 65px 61px; } .table-header { height: 33px; align-items: start; padding-top: 13px; color: #697078; font-size: 8pt; line-height: 8pt; } .table-header > :not(:first-child) { text-align: center; } .row { min-height: 30px; align-items: center; border-bottom: 0.5px solid #d8dce0; } .row-name { grid-column: 1; padding: 7px 12px 7px 0; font-size: 9pt; line-height: 11pt; color: #23272b; } .row-description { margin-top: 2px; color: #697078; font-size: 7pt; line-height: 9pt; } .row-values { grid-column: 2 / 5; display: grid; grid-template-columns: 55px 65px 61px; align-items: center; font-size: 8pt; line-height: 8pt; text-align: center; } .row-values > div { text-align: center; color: #23272b; } .summary { margin-top: 18px; margin-left: 326px; width: 201px; } .summary-top-line { height: 1.5px; background: #2388c9; width: 100%; margin-bottom: 15px; } .summary-row { display: flex; justify-content: space-between; align-items: baseline; min-height: 13px; color: #697078; font-size: 8pt; line-height: 8pt; } .summary-row + .summary-row { margin-top: 5px; } .summary-divider { height: 0.7px; background: #d8dce0; margin-top: 4px; margin-bottom: 11px; } .grand-total { display: flex; justify-content: space-between; align-items: baseline; color: #2388c9; } .grand-total-label { font-size: 10pt; line-height: 10pt; font-weight: 700; } .grand-total-value { font-size: 13pt; line-height: 13pt; font-weight: 700; } .document-notes { margin-top: 24px; padding-top: 12px; border-top: 0.5px solid #d8dce0; font-size: 7.5pt; color: #697078; line-height: 1.4; } .notes-label { font-weight: 600; margin-bottom: 2px; color: #23272b; } .top-bar { text-align: center; margin-bottom: 16px; } .print-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; background: #2388c9; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; } .print-btn:hover { background: #1a74ad; } @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; background: transparent; } .top-bar { display: none !important; } .estimate-page { margin: 0; box-shadow: none; width: 100%; min-height: auto; padding: 20mm; } } @media screen { body { padding: 24px 12px; background: #f0f2f5; display: flex; flex-direction: column; align-items: center; } .estimate-page { box-shadow: 0 4px 24px rgba(0,0,0,0.12); } }</style></head><body><div class="top-bar"><button class="print-btn" onclick="window.print()">Распечатать смету</button></div><main class="estimate-page"><div class="header-line"></div><div class="document-title"><div class="document-title-left"><span class="document-number">${escapeHtml(documentTitle)}</span>${objectHtml}</div>${contractorHtml}</div>${sectionsHtml}<div class="summary"><div class="summary-top-line"></div>${summaryLines}${discountHtml}<div class="summary-divider"></div><div class="grand-total"><span class="grand-total-label">ИТОГО К ОПЛАТЕ:</span><span class="grand-total-value">${escapeHtml(money(grandTotal))}</span></div></div>${notesHtml}<script type="application/json" id="smeta-app-data">${embeddedJson}</script></main></body></html>`;
}

export function exportToHTML(estimate: Estimate): void {
  const html = generateStandaloneHTML(estimate);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeCustomer = (estimate.customer || estimate.title || 'Смета').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
  a.href = url;
  a.download = `Бэкап_${safeCustomer}_${estimate.date || 'date'}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function triggerPrintPDF(estimate: Estimate): void {
  try {
    const html = generateStandaloneHTML(estimate);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; iframe.setAttribute('title', 'Печать сметы'); document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) { doc.open(); doc.write(html); doc.close(); setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => iframe.remove(), 3000); }, 400); } else exportToHTML(estimate);
  } catch { exportToHTML(estimate); }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
