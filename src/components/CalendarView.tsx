import React, { useState, useEffect } from 'react';
import { Folder, User, DocumentItem } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  RefreshCw,
  BellRing,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User as UserIcon,
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  assignmentId: string;
  documentId: string;
  title: string;
  fileType: string;
  folderId: string | null;
  folderName: string;
  assignedUserId: string;
  assignedUserName: string;
  dueDate: string;
  date: string;
  status: string;
  diffDays: number;
  isOverdue: boolean;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  reviewComment?: string | null;
}

interface CalendarViewProps {
  userRole: 'admin' | 'user';
  authToken: string;
  folders: Folder[];
  users: User[];
  onOpenDocument: (document: DocumentItem) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  userRole,
  authToken,
  folders,
  users,
  onOpenDocument,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: string; events: CalendarEvent[] } | null>(null);
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFolderFilter) params.append('folderId', selectedFolderFilter);
      if (selectedUserFilter) params.append('userId', selectedUserFilter);
      if (selectedStatusFilter) params.append('status', selectedStatusFilter);

      const res = await fetch(`/api/calendar/events?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedFolderFilter, selectedUserFilter, selectedStatusFilter, authToken]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Run alerts scheduler manually
  const handleTriggerAlerts = async () => {
    try {
      const res = await fetch('/api/notifications/run-alerts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      setAlertFeedback(`Alertas evaluadas: se generaron ${data.alertsGenerated} notificaciones.`);
      setTimeout(() => setAlertFeedback(null), 5000);
      fetchEvents();
    } catch (err) {
      console.error('Error running alerts:', err);
    }
  };

  // Build calendar matrix
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day of week for 1st (0: Sun -> convert so Mon is 0)
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const totalDays = lastDayOfMonth.getDate();

  const calendarDays: { day: number | null; dateStr: string | null; isToday: boolean }[] = [];

  // Padding days before start of month
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push({ day: null, dateStr: null, isToday: false });
  }

  // Days of month
  const todayStr = new Date().toISOString().split('T')[0];
  for (let d = 1; d <= totalDays; d++) {
    const dObj = new Date(year, month, d);
    const dStr = dObj.toISOString().split('T')[0];
    calendarDays.push({
      day: d,
      dateStr: dStr,
      isToday: dStr === todayStr,
    });
  }

  // Month title formatted in Spanish
  const monthName = firstDayOfMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const getEventBadgeClass = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'yellow':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'red':
        return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800';
      case 'blue':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      default:
        return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700';
    }
  };

  const handleOpenEvent = async (ev: CalendarEvent) => {
    try {
      const res = await fetch(`/api/documents/${ev.documentId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        onOpenDocument(data.document);
      }
    } catch (err) {
      console.error('Error opening document:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <span>Calendario de Plazos y Entregas</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Cronograma mensual con codificación de colores por estado y vencimiento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {userRole === 'admin' && (
            <button
              onClick={handleTriggerAlerts}
              title="Evaluar alertas automáticas de 7, 3 y 1 días"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-500" />
              <span>Evaluar Alertas de Plazo</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-0.5 text-xs font-medium rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
            >
              Hoy
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {alertFeedback && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <BellRing className="w-4 h-4" />
          <span>{alertFeedback}</span>
        </div>
      )}

      {/* Filters Bar & Color Legend */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          <select
            value={selectedFolderFilter}
            onChange={(e) => setSelectedFolderFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
          >
            <option value="">Todas las carpetas</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                📁 {f.name}
              </option>
            ))}
          </select>

          {userRole === 'admin' && (
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
            >
              <option value="">Todos los usuarios</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  👤 {u.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="in_progress">En progreso</option>
            <option value="submitted">Entregados</option>
            <option value="approved">Aprobados</option>
            <option value="changes_requested">Requiere correcciones</option>
          </select>

          <button
            onClick={fetchEvents}
            title="Refrescar calendario"
            className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <span className="font-semibold text-neutral-500">Convención de colores:</span>
          <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Aprobado / A tiempo
          </span>
          <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> En progreso / Entregado
          </span>
          <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Próximo a vencer (≤ 3 días)
          </span>
          <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Vencido / Correcciones
          </span>
          <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" /> Pendiente
          </span>
        </div>
      </div>

      {/* Month Title */}
      <div className="px-1 flex items-center justify-between">
        <h2 className="text-base font-bold capitalize text-neutral-900 dark:text-neutral-100">
          {monthName}
        </h2>
        <span className="text-xs text-neutral-500 font-mono">
          {events.length} evento(s) programado(s)
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-center text-xs font-semibold text-neutral-600 dark:text-neutral-300 py-2.5">
          <div>Lun</div>
          <div>Mar</div>
          <div>Mié</div>
          <div>Jue</div>
          <div>Vie</div>
          <div>Sáb</div>
          <div>Dom</div>
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-neutral-200 dark:divide-neutral-800 border-b border-neutral-200 dark:border-neutral-800">
          {calendarDays.map((item, index) => {
            if (!item.day || !item.dateStr) {
              return (
                <div
                  key={`pad-${index}`}
                  className="min-h-[110px] bg-neutral-50/40 dark:bg-neutral-950/40 p-1.5"
                />
              );
            }

            const dayEvents = events.filter((e) => e.date === item.dateStr);

            return (
              <div
                key={item.dateStr}
                onClick={() => {
                  if (dayEvents.length > 0) {
                    setSelectedDayEvents({ date: item.dateStr!, events: dayEvents });
                  }
                }}
                className={`min-h-[110px] p-2 flex flex-col justify-between transition ${
                  item.isToday ? 'bg-blue-50/30 dark:bg-blue-950/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                } ${dayEvents.length > 0 ? 'cursor-pointer' : ''}`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                      item.isToday
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {item.day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-mono font-bold text-neutral-400">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Day Events List */}
                <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[75px]">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEvent(ev);
                      }}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium border truncate block transition cursor-pointer ${getEventBadgeClass(
                        ev.color
                      )}`}
                    >
                      <span className="font-bold mr-1">[{ev.fileType.toUpperCase()}]</span>
                      {ev.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-neutral-400 font-mono block pl-1">
                      +{dayEvents.length - 3} más...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Modal / Drawer */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  Entregas del Día
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  {new Date(selectedDayEvents.date + 'T00:00:00').toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
              {selectedDayEvents.events.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    handleOpenEvent(ev);
                    setSelectedDayEvents(null);
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer hover:shadow-xs ${getEventBadgeClass(
                    ev.color
                  )}`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold">{ev.title}</span>
                    <span className="uppercase font-mono text-[10px]">[{ev.fileType}]</span>
                  </div>
                  <p className="text-[11px] opacity-80">
                    Asignado a: {ev.assignedUserName} · Carpeta: {ev.folderName}
                  </p>
                  <div className="flex items-center justify-between text-[11px] mt-2 font-mono">
                    <span>Estado: {ev.status}</span>
                    <span className="font-semibold underline">Abrir documento →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
