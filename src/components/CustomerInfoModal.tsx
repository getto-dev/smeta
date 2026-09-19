import React, { useEffect, useState } from 'react';
import { FileText, Check, Building2, User, Phone, MapPin, Calendar, MessageSquare } from 'lucide-react';
import type { Estimate } from '../types';
import { Button, FieldLabel, Modal, TextArea, TextInput } from './ui';

interface CustomerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: Estimate;
  onSave: (updated: Partial<Estimate>) => void;
}

export const CustomerInfoModal: React.FC<CustomerInfoModalProps> = ({ isOpen, onClose, estimate, onSave }) => {
  const [title, setTitle] = useState(estimate.title || '');
  const [customer, setCustomer] = useState(estimate.customer || '');
  const [companyName, setCompanyName] = useState(estimate.companyName || '');
  const [phone, setPhone] = useState(estimate.phone || '');
  const [address, setAddress] = useState(estimate.address || '');
  const [date, setDate] = useState(estimate.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(estimate.notes || '');

  useEffect(() => {
    if (!isOpen) return;
    setTitle(estimate.title || '');
    setCustomer(estimate.customer || '');
    setCompanyName(estimate.companyName || '');
    setPhone(estimate.phone || '');
    setAddress(estimate.address || '');
    setDate(estimate.date || new Date().toISOString().split('T')[0]);
    setNotes(estimate.notes || '');
  }, [estimate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    onSave({
      title: title.trim(),
      customer: customer.trim(),
      companyName: companyName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      date: date || today,
      notes: notes.trim(),
    });
    onClose();
  };

  const handleEnterNavigation = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const target = e.target;
    if (!(target instanceof HTMLInputElement) || target.type === 'submit') return;
    const fields = Array.from(e.currentTarget.elements).filter(
      (element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
        element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement,
    );
    const index = fields.indexOf(target);
    const next = fields.slice(index + 1).find((field) => !field.disabled);
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const labelClass = 'flex items-center gap-1';
  const iconClass = 'h-3.5 w-3.5 text-amber-400';

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="customer-info-title" className="p-5 sm:max-w-lg sm:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 id="customer-info-title" className="text-lg font-bold text-white">Параметры сметы</h2>
            <p className="text-xs text-slate-400">Незаполненные поля не будут отображаться в итоговой смете</p>
          </div>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Закрыть" className="min-w-11 px-2 text-xl sm:min-w-0">×</Button>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleEnterNavigation} className="space-y-3.5">
        <div>
          <FieldLabel htmlFor="estimate-title">Название проекта / сметы</FieldLabel>
          <TextInput id="estimate-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Ремонт квартиры ЖК Панорама, кв. 42" enterKeyHint="next" autoComplete="off" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="estimate-customer" className={labelClass}><User className={iconClass} />Клиент / Заказчик</FieldLabel>
            <TextInput id="estimate-customer" type="text" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="ФИО или организация" enterKeyHint="next" autoComplete="name" />
          </div>
          <div>
            <FieldLabel htmlFor="estimate-company" className={labelClass}><Building2 className={iconClass} />Компания / Подрядчик</FieldLabel>
            <TextInput id="estimate-company" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="ИП Иванов А.В. / ООО МастерСтрой" enterKeyHint="next" autoComplete="organization" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="estimate-phone" className={labelClass}><Phone className={iconClass} />Телефон</FieldLabel>
            <TextInput id="estimate-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 000-00-00" enterKeyHint="next" autoComplete="tel" />
          </div>
          <div>
            <FieldLabel htmlFor="estimate-date" className={labelClass}><Calendar className={iconClass} />Дата сметы</FieldLabel>
            <TextInput id="estimate-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} enterKeyHint="next" />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="estimate-address" className={labelClass}><MapPin className={iconClass} />Адрес объекта</FieldLabel>
          <TextInput id="estimate-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="г. Москва, ул. Ленина, д. 15, кв. 42" enterKeyHint="next" autoComplete="street-address" />
        </div>

        <div>
          <FieldLabel htmlFor="estimate-notes" className={labelClass}><MessageSquare className={iconClass} />Условия / Примечания к смете</FieldLabel>
          <TextArea id="estimate-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Гарантия на работы 24 месяца. Предоплата 30%. Черновые материалы включены по факту закупки." />
        </div>

        <div className="flex gap-2.5 border-t border-slate-800 pt-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Отмена</Button>
          <Button variant="primary" type="submit" className="flex-1"><Check className="h-4 w-4" />Сохранить</Button>
        </div>
      </form>
    </Modal>
  );
};
