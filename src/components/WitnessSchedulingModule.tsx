import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  Plus, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  FileText, 
  Trash2, 
  Edit3, 
  Building2, 
  BellRing, 
  Printer, 
  ShieldCheck,
  UserX,
  UserCheck2,
  Clock3,
  Upload
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { 
  WitnessSlot, 
  WitnessStatus, 
  WitnessType, 
  getWitnessSlotsFromCache, 
  createOrUpdateWitnessSlot, 
  deleteWitnessSlot, 
  updateWitnessSlotStatus, 
  sendWitnessAutomatedReminder,
  batchImportWitnessesFromCsv
} from '../services/witnessSchedulingService';

interface WitnessSchedulingModuleProps {
  currentLang: Language;
  activeCaseNumber?: string;
  activeCaseTitle?: string;
}

export const WitnessSchedulingModule: React.FC<WitnessSchedulingModuleProps> = ({
  currentLang,
  activeCaseNumber = '',
  activeCaseTitle = '',
}) => {
  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const [slots, setSlots] = useState<WitnessSlot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedSlot, setSelectedSlot] = useState<WitnessSlot | null>(null);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  const [formCaseNumber, setFormCaseNumber] = useState(activeCaseNumber || 'CR-2026/089');
  const [formCaseTitle, setFormCaseTitle] = useState(activeCaseTitle || 'Abbaa Alangaa vs Gemechu Tadesse');
  const [formWitnessName, setFormWitnessName] = useState('');
  const [formWitnessPhone, setFormWitnessPhone] = useState('');
  const [formWitnessEmail, setFormWitnessEmail] = useState('');
  const [formWitnessType, setFormWitnessType] = useState<WitnessType>('eyewitness');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formTimeSlot, setFormTimeSlot] = useState('09:30 AM - 11:00 AM');
  const [formCourtroom, setFormCourtroom] = useState('Dhaddacha 1 (Chamber A)');
  const [formBenchJudge, setFormBenchJudge] = useState('Abbaa Seeraa Caalaa');
  const [formStatus, setFormStatus] = useState<WitnessStatus>('scheduled');
  const [formNotes, setFormNotes] = useState('');

  const [reminderToast, setReminderToast] = useState<{ id: string; msg: string } | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  useEffect(() => {
    loadSlots();
    const handleUpdate = () => loadSlots();
    window.addEventListener('seera_witness_slots_updated', handleUpdate);
    return () => window.removeEventListener('seera_witness_slots_updated', handleUpdate);
  }, []);

  const loadSlots = () => {
    const list = getWitnessSlotsFromCache();
    setSlots(list);
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert(isOm ? 'Galmeen CSV qullaa dha ykn sarara gahaa hin qabu.' : 'CSV file is empty or missing data rows.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
      const records: Array<Partial<WitnessSlot>> = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
        if (row.length === 0 || !row[0]) continue;

        const record: Partial<WitnessSlot> = {};
        headers.forEach((h, idx) => {
          const val = row[idx] || '';
          if (h.includes('name') || h.includes('maqaa') || h.includes('witness')) record.witnessName = val;
          else if (h.includes('phone') || h.includes('bilbila') || h.includes('contact')) record.witnessPhone = val;
          else if (h.includes('email')) record.witnessEmail = val;
          else if (h.includes('case') || h.includes('galmee')) record.caseNumber = val;
          else if (h.includes('title') || h.includes('dhimma')) record.caseTitle = val;
          else if (h.includes('date') || h.includes('guyyaa') || h.includes('availability')) record.availabilityDate = val;
          else if (h.includes('time') || h.includes('slot')) record.timeSlot = val;
          else if (h.includes('room') || h.includes('dhaddacha')) record.courtroom = val;
          else if (h.includes('type')) record.witnessType = val as WitnessType;
          else if (h.includes('notes') || h.includes('yaada')) record.notes = val;
        });

        if (!record.witnessName && row[0]) {
          record.witnessName = row[0];
          if (row[1]) record.witnessPhone = row[1];
          if (row[2]) record.witnessEmail = row[2];
          if (row[3]) record.availabilityDate = row[3];
        }

        if (record.witnessName) records.push(record);
      }

      if (records.length > 0) {
        const count = await batchImportWitnessesFromCsv(records);
        loadSlots();
        setReminderToast({
          id: Date.now().toString(),
          msg: isOm ? `Tarreen Ragaa ${count} CSV irraa milkaa'inaan galmeeffameera!` : `Successfully imported ${count} witness records from CSV!`
        });
      } else {
        alert(isOm ? 'Galmee CSV irraa ragaan fayyadu hin argamne.' : 'No valid witness records found in CSV.');
      }
    } catch (err) {
      console.error('CSV import error:', err);
      alert(isOm ? "Kukkuun dhiyaateera. CSV sirrii ta'uu mirkaneessaa." : "CSV import error. Please check file format.");
    }
    e.target.value = '';
  };

  const handleOpenAddModal = () => {
    setEditingSlotId(null);
    setFormCaseNumber(activeCaseNumber || 'CR-2026/089');
    setFormCaseTitle(activeCaseTitle || 'Abbaa Alangaa vs Gemechu Tadesse');
    setFormWitnessName('');
    setFormWitnessPhone('');
    setFormWitnessEmail('');
    setFormWitnessType('eyewitness');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTimeSlot('09:30 AM - 11:00 AM');
    setFormCourtroom('Dhaddacha 1 (Chamber A)');
    setFormBenchJudge('Abbaa Seeraa Caalaa');
    setFormStatus('scheduled');
    setFormNotes('');
    setShowModal(true);
  };

  const handleOpenEditModal = (slot: WitnessSlot) => {
    setEditingSlotId(slot.id);
    setFormCaseNumber(slot.caseNumber);
    setFormCaseTitle(slot.caseTitle);
    setFormWitnessName(slot.witnessName);
    setFormWitnessPhone(slot.witnessPhone);
    setFormWitnessEmail(slot.witnessEmail);
    setFormWitnessType(slot.witnessType);
    setFormDate(slot.availabilityDate);
    setFormTimeSlot(slot.timeSlot);
    setFormCourtroom(slot.courtroom);
    setFormBenchJudge(slot.benchJudge || '');
    setFormStatus(slot.status);
    setFormNotes(slot.notes || '');
    setShowModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWitnessName.trim() || !formCaseNumber.trim()) {
      alert(isOm ? 'Maaloo maqaa ragaa fi lakkoofsa galmee guutaa!' : 'Please enter witness name and case number!');
      return;
    }

    await createOrUpdateWitnessSlot({
      id: editingSlotId || undefined,
      caseNumber: formCaseNumber,
      caseTitle: formCaseTitle,
      witnessName: formWitnessName,
      witnessPhone: formWitnessPhone,
      witnessEmail: formWitnessEmail,
      witnessType: formWitnessType,
      availabilityDate: formDate,
      timeSlot: formTimeSlot,
      courtroom: formCourtroom,
      benchJudge: formBenchJudge,
      status: formStatus,
      notes: formNotes,
      reminderSent: editingSlotId ? (slots.find(s => s.id === editingSlotId)?.reminderSent || false) : false,
    });

    setShowModal(false);
    loadSlots();
  };

  const handleDelete = async (id: string) => {
    if (confirm(isOm ? 'Ragaa kana faayila beellamaa irraa haquu ni meeraa?' : 'Are you sure you want to delete this witness slot?')) {
      await deleteWitnessSlot(id);
      loadSlots();
    }
  };

  const handleStatusChange = async (id: string, newStatus: WitnessStatus) => {
    await updateWitnessSlotStatus(id, newStatus);
    loadSlots();
  };

  const handleSendReminder = async (slot: WitnessSlot) => {
    setSendingReminderId(slot.id);
    const res = await sendWitnessAutomatedReminder(slot.id, 'both');
    setSendingReminderId(null);
    if (res.success) {
      setReminderToast({ id: slot.id, msg: res.message });
      setTimeout(() => setReminderToast(null), 5000);
      loadSlots();
    }
  };

  const handlePrintSchedule = () => {
    window.print();
  };

  // Filtered Slots
  const filteredSlots = slots.filter((slot) => {
    const matchesSearch = 
      slot.witnessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      slot.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      slot.caseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      slot.witnessPhone.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || slot.status === statusFilter;
    const matchesType = typeFilter === 'all' || slot.witnessType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalSlots = slots.length;
  const confirmedSlots = slots.filter(s => s.status === 'confirmed').length;
  const subpoenaedSlots = slots.filter(s => s.status === 'subpoenaed').length;
  const remindersSentCount = slots.filter(s => s.reminderSent).length;

  const getStatusBadge = (status: WitnessStatus) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1"><UserCheck2 className="w-3 h-3"/> {isOm ? 'Mirkanaa\'aa' : isAm ? 'ተረጋግጧል' : 'Confirmed'}</span>;
      case 'subpoenaed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> {isOm ? 'Wamichi Ergame' : isAm ? 'መጥሪያ ተልኳል' : 'Subpoenaed'}</span>;
      case 'scheduled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1"><Clock3 className="w-3 h-3"/> {isOm ? 'Qophii Beellamaa' : isAm ? 'የተያዘ' : 'Scheduled'}</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {isOm ? 'Hojiin Xumurame' : isAm ? 'ተጠናቋል' : 'Completed'}</span>;
      case 'excused':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-1">{isOm ? 'Dhiifama Pata' : 'Excused'}</span>;
      case 'no_show':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1"><UserX className="w-3 h-3"/> {isOm ? 'Hin Dhihaanne' : isAm ? 'አልቀረበም' : 'No Show'}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const getTypeLabel = (type: WitnessType) => {
    switch (type) {
      case 'eyewitness': return isOm ? 'Ragaa Ijaa (Eyewitness)' : isAm ? 'የዓይን እያን प्रत्यक्ष' : 'Eyewitness';
      case 'expert': return isOm ? 'Ragaa Ogeessa Seeraa (Expert Witness)' : isAm ? 'የባለሙያ ምስክር' : 'Expert Witness';
      case 'police': return isOm ? 'Ragaa Poolisii (Police Investigator)' : isAm ? 'የፖሊስ ምስክር' : 'Police Investigator';
      case 'character': return isOm ? 'Ragaa Amala (Character Witness)' : isAm ? 'የባህርይ ምስክር' : 'Character Witness';
      case 'victim': return isOm ? 'Miidhamaa (Victim/Plaintiff)' : isAm ? 'ተጎጂ' : 'Victim / Complainant';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification for Reminder */}
      {reminderToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-900/95 border border-emerald-400 text-emerald-100 p-4 rounded-2xl shadow-2xl max-w-md animate-in slide-in-from-top-4 duration-300 flex items-start gap-3">
          <BellRing className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5 animate-bounce" />
          <div className="text-xs">
            <h4 className="font-bold text-emerald-300 mb-1">Automated Reminder Dispatched</h4>
            <p className="leading-relaxed">{reminderToast.msg}</p>
          </div>
        </div>
      )}

      {/* Module Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-xl font-bold shrink-0 shadow-inner">
              👥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider font-mono">
                  🏛️ Registraara & Mana Murtii
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {isOm ? 'Beellama Ragaa' : isAm ? 'የምስክሮች ቀጠሮ' : 'Witness Scheduling'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1 font-serif-legal">
                {isOm 
                  ? 'Bulchiinsa Beellama Ragaalee (Witness Availability & Scheduling)' 
                  : isAm 
                  ? 'የምስክሮች የጊዜ ሰሌዳ እና ቀጠሮ ማኔጅመንት' 
                  : 'Witness Availability & Scheduling Module'}
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {isOm 
                  ? "Registraaroonni fi hojjettonni mana murtii beellama ragaalee galmeewwan irratti qabsiisuu, ergaa SMS/Email yaadachiisaa erguu fi tarree beellamaa to'achuuf danda'u." 
                  : "Allows court registrars to attach witness availability slots to specific case files and dispatch automated reminders (SMS/Email)."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>{isOm ? 'CSV Galchu' : isAm ? 'CSV አስገባ' : 'CSV Import'}</span>
              <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
            </label>

            <button
              onClick={handlePrintSchedule}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
              title="Print Schedule / Export PDF"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{isOm ? 'Maxxansi (Print)' : 'Print Schedule'}</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{isOm ? 'Ragaa Haaraa Qabsiisi' : isAm ? 'አዲስ ምስክር ጨምር' : 'Attach Witness Slot'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">{isOm ? 'Ida\'ama Ragaalee' : 'Total Witnesses'}</div>
              <div className="text-base font-bold text-white font-mono">{totalSlots}</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">{isOm ? 'Mirkanaa\'an' : 'Confirmed'}</div>
              <div className="text-base font-bold text-emerald-400 font-mono">{confirmedSlots}</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">{isOm ? 'Wamichi Ergame' : 'Subpoenaed'}</div>
              <div className="text-base font-bold text-amber-400 font-mono">{subpoenaedSlots}</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">{isOm ? 'Ergaa Yaadachiisaa' : 'Reminders Sent'}</div>
              <div className="text-base font-bold text-purple-300 font-mono">{remindersSentCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isOm ? 'Barbaadi (Maqaa, Galmee, Bilbila)...' : 'Search by name, case no, phone...'}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>{isOm ? 'Haala:' : 'Status:'}</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">{isOm ? 'Hunda (All)' : 'All Statuses'}</option>
            <option value="scheduled">Scheduled</option>
            <option value="subpoenaed">Subpoenaed</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="excused">Excused</option>
            <option value="no_show">No Show</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">{isOm ? 'Gosa Ragaa (All Types)' : 'All Witness Types'}</option>
            <option value="eyewitness">Eyewitness</option>
            <option value="expert">Expert Witness</option>
            <option value="police">Police Officer</option>
            <option value="character">Character Witness</option>
            <option value="victim">Victim / Complainant</option>
          </select>
        </div>
      </div>

      {/* Witness Slots List Grid */}
      {filteredSlots.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <UserCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1 font-serif-legal">
            {isOm ? 'Beellamni Ragaa Hin Argamne' : 'No Witness Slots Found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            {isOm 
              ? 'Beellamni ragaa tokkollee saaggaan kana waliin wal-gitu hin jiru. "Ragaa Haaraa Qabsiisi" button tuquun galmeessaa.' 
              : 'No witness slots match your filter. Click "Attach Witness Slot" to add a scheduled witness to a case.'}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isOm ? 'Ragaa Haaraa Qabsiisi' : 'Attach Witness Slot'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSlots.map((slot) => (
            <div
              key={slot.id}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 shadow-lg transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header Row: Case Number & Status */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-950 text-amber-400 border border-slate-800">
                    {slot.caseNumber}
                  </span>
                  {getStatusBadge(slot.status)}
                </div>

                {/* Witness Name & Type */}
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-2">
                  <span>{slot.witnessName}</span>
                </h3>
                <div className="text-[11px] text-amber-400 font-medium mb-3">
                  🏷️ {getTypeLabel(slot.witnessType)}
                </div>

                {/* Case Title */}
                <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 mb-3 line-clamp-2">
                  <span className="font-semibold text-slate-400">Galmee: </span>
                  {slot.caseTitle}
                </p>

                {/* Date, Time & Courtroom Details */}
                <div className="space-y-2 text-xs text-slate-300 mb-4 bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isOm ? 'Guyyaa Beellamaa:' : 'Scheduled Date:'}</span>
                    </span>
                    <span className="font-mono font-bold text-white">{slot.availabilityDate}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isOm ? 'Sa\'aatii:' : 'Time Slot:'}</span>
                    </span>
                    <span className="font-mono text-amber-300">{slot.timeSlot}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isOm ? 'Dhaddacha:' : 'Courtroom:'}</span>
                    </span>
                    <span className="text-slate-200 truncate max-w-[140px]">{slot.courtroom}</span>
                  </div>

                  {slot.witnessPhone && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-850">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Bilbila:</span>
                      </span>
                      <span className="font-mono text-emerald-300 text-[11px]">{slot.witnessPhone}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {slot.notes && (
                  <p className="text-[11px] text-slate-400 italic mb-4 line-clamp-2">
                    "{slot.notes}"
                  </p>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                {/* Automated Reminder Dispatch Button */}
                <button
                  onClick={() => handleSendReminder(slot)}
                  disabled={sendingReminderId === slot.id}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow ${
                    slot.reminderSent
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600/30'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  <Send className={`w-3.5 h-3.5 ${sendingReminderId === slot.id ? 'animate-spin' : ''}`} />
                  <span>
                    {sendingReminderId === slot.id
                      ? (isOm ? 'Ergamaa Jira...' : 'Dispatching...')
                      : slot.reminderSent
                      ? (isOm ? `⚡ Ergameera (${slot.lastReminderAt || 'Done'})` : `⚡ Re-send Reminder (${slot.lastReminderAt || 'Sent'})`)
                      : (isOm ? 'Ergaa Yaadachiisaa Ergi (SMS/Email)' : 'Send Automated Reminder')}
                  </span>
                </button>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {/* Status Toggle Quick Selector */}
                  <select
                    value={slot.status}
                    onChange={(e) => handleStatusChange(slot.id, e.target.value as WitnessStatus)}
                    className="px-2 py-1 bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="subpoenaed">Subpoenaed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="excused">Excused</option>
                    <option value="no_show">No Show</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(slot)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      title="Edit Slot"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                      title="Delete Slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                  ⚖️
                </div>
                <div>
                  <h3 className="font-bold text-white text-base font-serif-legal">
                    {editingSlotId 
                      ? (isOm ? 'Gulaala Beellama Ragaa' : 'Edit Witness Slot') 
                      : (isOm ? 'Beellama Ragaa Haaraa Qabsiisi' : 'Attach Witness Availability Slot')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isOm ? 'Odeeffannoo Ragaa fi Galmee Mana Murtii Guutaa' : 'Fill in witness contact details and hearing schedule'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isOm ? 'Lakkoofsa Galmee (Case No)' : 'Case Number'} *
                  </label>
                  <input
                    type="text"
                    value={formCaseNumber}
                    onChange={(e) => setFormCaseNumber(e.target.value)}
                    required
                    placeholder="e.g. CR-2026/089"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isOm ? 'Gosa Ragaa (Witness Type)' : 'Witness Type'}
                  </label>
                  <select
                    value={formWitnessType}
                    onChange={(e) => setFormWitnessType(e.target.value as WitnessType)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="eyewitness">Ragaa Ijaa (Eyewitness)</option>
                    <option value="expert">Ragaa Ogeessaa (Expert Witness)</option>
                    <option value="police">Ragaa Poolisii (Police Investigator)</option>
                    <option value="character">Ragaa Amala (Character Witness)</option>
                    <option value="victim">Miidhamaa (Victim/Plaintiff)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isOm ? 'Mata Duree Galmee (Case Title)' : 'Case Title'}
                </label>
                <input
                  type="text"
                  value={formCaseTitle}
                  onChange={(e) => setFormCaseTitle(e.target.value)}
                  placeholder="e.g. Abbaa Alangaa vs Gemechu Tadesse"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isOm ? 'Maqaa Guutuu Ragaa (Witness Full Name)' : 'Witness Full Name'} *
                </label>
                <input
                  type="text"
                  value={formWitnessName}
                  onChange={(e) => setFormWitnessName(e.target.value)}
                  required
                  placeholder="e.g. Obbo Tolaa Hayiluu"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isOm ? 'Lakk. Bilbilaa (Phone)' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    value={formWitnessPhone}
                    onChange={(e) => setFormWitnessPhone(e.target.value)}
                    placeholder="+251911..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isOm ? 'Email' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={formWitnessEmail}
                    onChange={(e) => setFormWitnessEmail(e.target.value)}
                    placeholder="witness@example.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isOm ? 'Guyyaa Beellamaa (Date)' : 'Hearing Date'} *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isOm ? 'Sa\'aatii Beellamaa (Time Slot)' : 'Time Slot'}
                  </label>
                  <select
                    value={formTimeSlot}
                    onChange={(e) => setFormTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="09:00 AM - 10:30 AM">09:00 AM - 10:30 AM</option>
                    <option value="10:30 AM - 12:00 PM">10:30 AM - 12:00 PM</option>
                    <option value="02:00 PM - 03:30 PM">02:00 PM - 03:30 PM</option>
                    <option value="03:30 PM - 05:00 PM">03:30 PM - 05:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isOm ? 'Dhaddacha (Courtroom / Chamber)' : 'Courtroom / Chamber'}
                  </label>
                  <input
                    type="text"
                    value={formCourtroom}
                    onChange={(e) => setFormCourtroom(e.target.value)}
                    placeholder="Dhaddacha 1"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isOm ? 'Abbaa Seeraa (Assigned Judge)' : 'Assigned Judge'}
                  </label>
                  <input
                    type="text"
                    value={formBenchJudge}
                    onChange={(e) => setFormBenchJudge(e.target.value)}
                    placeholder="Abbaa Seeraa..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isOm ? 'Haala Beellamaa (Status)' : 'Status'}
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as WitnessStatus)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="subpoenaed">Subpoenaed</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="excused">Excused</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isOm ? 'Yaada Dabalataa / Ajaja (Notes)' : 'Notes & Instructions'}
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder={isOm ? 'Akeekkachiisa ykn yaada ragaaf kennamu...' : 'Special instructions or notes...'}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  {isOm ? 'Dhiisi' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg transition-all"
                >
                  {editingSlotId ? (isOm ? 'Haoromsi (Save)' : 'Save Changes') : (isOm ? 'Qabsiisi (Attach Slot)' : 'Attach Witness Slot')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
