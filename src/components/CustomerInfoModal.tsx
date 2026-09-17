import React, { useState, useEffect } from 'react';
import { X, FileText, Check, Building2, User, Phone, MapPin, Calendar, MessageSquare } from 'lucide-react';
import type { Estimate } from '../types';
import { Button, FieldLabel, IconButton, Panel, TextArea, TextInput } from './ui';

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
    setTitle(estimate.title || '');
    setCustomer(estimate.customer || '');
    setCompanyName(estimate.companyName || '');
    setPhone(estimate.phone || '');
    setAddress(estimate.address || '');
    setDate(estimate.date || new Date().toISOString().split('T')[0]);
    setNotes(estimate.notes || '');
  }, [estimate]);

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

  const labelClass = 'flex items-center gap-1';
  const iconClass = 'w-3.5 h-3.5 text-amber-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <Panel className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 text-slate-100 sm:p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Параметры сметы</h2>
              <p className="text-xs text-slate-400">Незаполненные поля не будут отображаться в итоговой смете</p>
            </div>
          </div>
          <IconButton size="sm" onClick={onClose} aria-label="Закрыть" title="Закрыть">
            <X className="w-5 h-5" />
          </IconButton>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <FieldLabel htmlFor="estimate-title">Название проекта / сметы</FieldLabel>
            <TextInput id="estimate-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Ремонт квартиры ЖК Панорама, кв. 42" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="estimate-customer" className={labelClass}><User className={iconClass} />Клиент / Заказчик</FieldLabel>
              <TextInput id="estimate-customer" type="text" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="ФИО или организация" />
            </div>
            <div>
              <FieldLabel htmlFor="estimate-company" className={labelClass}><Building2 className={iconClass} />Компания / Подрядчик</FieldLabel>
              <TextInput id="estimate-company" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="ИП Иванов А.В. / ООО МастерСтрой" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="estimate-phone" className={labelClass}><Phone className={iconClass} />Телефон</FieldLabel>
              <TextInput id="estimate-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 000-00-00" />
            </div>
            <div>
              <FieldLabel htmlFor="estimate-date" className={labelClass}><Calendar className={iconClass} />Дата сметы</FieldLabel>
              <TextInput id="estimate-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="estimate-address" className={labelClass}><MapPin className={iconClass} />Адрес объекта</FieldLabel>
            <TextInput id="estimate-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="г. Москва, ул. Ленина, д. 15, кв. 42" />
          </div>

          <div>
            <FieldLabel htmlFor="estimate-notes" className={labelClass}><MessageSquare className={iconClass} />Условия / Примечания к смете</FieldLabel>
            <TextArea id="estimate-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Гарантия на работы 24 месяца. Предоплата 30%. Черновые материалы включены по факту закупки." />
          </div>

          <div className="flex gap-2.5 border-t border-slate-800 pt-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">Отмена</Button>
            <Button variant="primary" type="submit" className="flex-1"><Check className="h-4 w-4" />Сохранить</Button>
          </div>
        </form>
      </Panel>
    </div>
  );
};
