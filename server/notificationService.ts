import {
  NotificationRepository,
  AssignmentRepository,
  DocumentRepository,
  UserRepository,
  AuditRepository,
} from './db';
import { Assignment, NotificationType } from './types';

export const NotificationService = {
  // Dispatches alert when document is assigned
  onAssignmentCreated: (assignment: Assignment) => {
    const doc = DocumentRepository.findById(assignment.documentId);
    const user = UserRepository.findById(assignment.userId);
    if (!doc || !user) return;

    const dueDateFormatted = new Date(assignment.dueDate).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const permText =
      assignment.permissionLevel === 'view'
        ? 'Solo Ver'
        : assignment.permissionLevel === 'download'
        ? 'Ver y Descargar'
        : 'Ver y Subir Nuevas Versiones';

    NotificationRepository.create({
      userId: user.id,
      userEmail: user.email,
      title: 'Nuevo Documento Asignado',
      message: `Se le ha asignado el documento "${doc.title}" con permiso de "${permText}". Plazo límite de entrega: ${dueDateFormatted}.`,
      type: 'assignment',
      documentId: doc.id,
      documentTitle: doc.title,
      assignmentId: assignment.id,
      emailContent: {
        to: user.email,
        subject: `[GestiónDoc] Nuevo Documento Asignado: ${doc.title}`,
        bodyText: `Estimado/a ${user.name},\n\nSe le ha asignado el documento "${doc.title}" en la plataforma corporativa.\n\n- Nivel de Permiso: ${permText}\n- Fecha Límite de Entrega: ${dueDateFormatted}\n\nPuede ingresar al portal para revisar y gestionar el archivo.\n\nAtentamente,\nAdministración de Gestión Documental`,
      },
    });
  },

  // Dispatches alert when status changes or review is completed
  onStatusChanged: (assignment: Assignment, updatedByRole: 'admin' | 'user') => {
    const doc = DocumentRepository.findById(assignment.documentId);
    const user = UserRepository.findById(assignment.userId);
    if (!doc || !user) return;

    if (updatedByRole === 'user' && assignment.status === 'submitted') {
      // Notify Admin
      const admins = UserRepository.findAll().filter((u) => u.role === 'admin' && u.status === 'active');
      admins.forEach((adm) => {
        NotificationRepository.create({
          userId: adm.id,
          userEmail: adm.email,
          title: 'Entrega de Documento para Revisión',
          message: `${user.name} (${user.email}) ha marcado como entregado el documento "${doc.title}".`,
          type: 'status_change',
          documentId: doc.id,
          documentTitle: doc.title,
          assignmentId: assignment.id,
          emailContent: {
            to: adm.email,
            subject: `[GestiónDoc] Entrega Recibida: ${doc.title} - ${user.name}`,
            bodyText: `El usuario ${user.name} ha entregado el documento "${doc.title}" para su correspondiente revisión y aprobación en el sistema.`,
          },
        });
      });
    } else if (updatedByRole === 'admin') {
      // Notify assigned user
      const isApproved = assignment.status === 'approved';
      const title = isApproved ? 'Entrega de Documento Aprobada' : 'Correcciones Solicitadas en Entrega';
      const commentSnippet = assignment.reviewComment ? `\nComentario: "${assignment.reviewComment}"` : '';

      NotificationRepository.create({
        userId: user.id,
        userEmail: user.email,
        title,
        message: isApproved
          ? `Su entrega de "${doc.title}" ha sido aprobada satisfactoriamente por la administración.`
          : `La administración ha solicitado correcciones en "${doc.title}". ${commentSnippet}`,
        type: 'review_completed',
        documentId: doc.id,
        documentTitle: doc.title,
        assignmentId: assignment.id,
        emailContent: {
          to: user.email,
          subject: `[GestiónDoc] ${title}: ${doc.title}`,
          bodyText: `Estimado/a ${user.name},\n\nSu entrega para el documento "${doc.title}" ha sido evaluada por la administración.\n\nResultado: ${isApproved ? 'APROBADA' : 'REQUIERE CORRECCIONES'}${commentSnippet}\n\nIngrese al portal para revisar los detalles.\n\nAtentamente,\nEquipo de Gestión Documental`,
        },
      });
    }
  },

  // Dispatches alert when new version uploaded
  onVersionUploaded: (documentId: string, versionNumber: number, uploaderName: string) => {
    const doc = DocumentRepository.findById(documentId);
    if (!doc) return;

    // Notify all assigned users & admins
    const assignments = AssignmentRepository.findAll().filter((a) => a.documentId === documentId);
    const admins = UserRepository.findAll().filter((u) => u.role === 'admin');

    const notifiedUserIds = new Set<string>();

    assignments.forEach((asg) => {
      if (notifiedUserIds.has(asg.userId)) return;
      notifiedUserIds.add(asg.userId);
      const u = UserRepository.findById(asg.userId);
      if (u) {
        NotificationRepository.create({
          userId: u.id,
          userEmail: u.email,
          title: 'Nueva Versión de Documento Disponible',
          message: `${uploaderName} ha publicado la versión v${versionNumber} del documento "${doc.title}".`,
          type: 'version_uploaded',
          documentId: doc.id,
          documentTitle: doc.title,
          emailContent: {
            to: u.email,
            subject: `[GestiónDoc] Actualización v${versionNumber}: ${doc.title}`,
            bodyText: `Se ha publicado la versión v${versionNumber} de "${doc.title}" en el repositorio corporativo. Puede ingresar a comparar los cambios.`,
          },
        });
      }
    });

    admins.forEach((adm) => {
      if (notifiedUserIds.has(adm.id)) return;
      notifiedUserIds.add(adm.id);
      NotificationRepository.create({
        userId: adm.id,
        userEmail: adm.email,
        title: 'Nueva Versión Publicada',
        message: `${uploaderName} subió la versión v${versionNumber} de "${doc.title}".`,
        type: 'version_uploaded',
        documentId: doc.id,
        documentTitle: doc.title,
      });
    });
  },

  // Dispatches alert on new comment
  onCommentCreated: (documentId: string, authorName: string, authorRole: 'admin' | 'user', content: string) => {
    const doc = DocumentRepository.findById(documentId);
    if (!doc) return;

    const assignments = AssignmentRepository.findAll().filter((a) => a.documentId === documentId);
    const admins = UserRepository.findAll().filter((u) => u.role === 'admin');

    const targetUsers = authorRole === 'admin'
      ? assignments.map((a) => UserRepository.findById(a.userId)).filter(Boolean)
      : admins;

    targetUsers.forEach((u: any) => {
      NotificationRepository.create({
        userId: u.id,
        userEmail: u.email,
        title: `Nuevo Mensaje en "${doc.title}"`,
        message: `${authorName}: "${content.length > 80 ? content.slice(0, 77) + '...' : content}"`,
        type: 'comment',
        documentId: doc.id,
        documentTitle: doc.title,
        emailContent: {
          to: u.email,
          subject: `[GestiónDoc] Comentario en ${doc.title} - ${authorName}`,
          bodyText: `El usuario ${authorName} ha publicado un comentario en el documento "${doc.title}":\n\n"${content}"\n\nIngrese a la plataforma para responder.`,
        },
      });
    });
  },

  // Evaluates pending assignments for 7d, 3d, 1d, today and overdue alerts
  runAlertScheduler: (): { alertsGenerated: number } => {
    const assignments = AssignmentRepository.findAll().filter(
      (a) => a.status !== 'approved' // Only pending / in_progress / changes_requested
    );
    const now = Date.now();
    let generated = 0;

    const existingNotifs = NotificationRepository.findAll();

    for (const asg of assignments) {
      const doc = DocumentRepository.findById(asg.documentId);
      const user = UserRepository.findById(asg.userId);
      if (!doc || !user || !asg.dueDate) continue;

      const dueTime = new Date(asg.dueDate).getTime();
      const diffHours = (dueTime - now) / (1000 * 60 * 60);
      const diffDays = Math.ceil(diffHours / 24);

      let alertType: NotificationType | null = null;
      let alertTitle = '';
      let alertMsg = '';

      if (diffHours < 0) {
        // Overdue
        alertType = 'overdue';
        alertTitle = `¡Plazo Vencido! Documento: ${doc.title}`;
        alertMsg = `El plazo de entrega para "${doc.title}" venció hace ${Math.abs(diffDays)} día(s). Por favor envíe su entrega a la brevedad.`;
      } else if (diffDays <= 0 || (diffHours >= 0 && diffHours <= 24)) {
        // Due today
        alertType = 'due_today';
        alertTitle = `¡Vence Hoy! Plazo de Entrega: ${doc.title}`;
        alertMsg = `Hoy es la fecha límite para entregar el documento "${doc.title}".`;
      } else if (diffDays === 1) {
        // Due in 1 day
        alertType = 'due_soon_1d';
        alertTitle = `Plazo Próximo: 1 día restante para ${doc.title}`;
        alertMsg = `Le queda 1 día para cumplir con la entrega de "${doc.title}".`;
      } else if (diffDays <= 3 && diffDays > 1) {
        // Due in 3 days
        alertType = 'due_soon_3d';
        alertTitle = `Plazo Próximo: ${diffDays} días para ${doc.title}`;
        alertMsg = `Quedan ${diffDays} días para la entrega del documento "${doc.title}".`;
      } else if (diffDays <= 7 && diffDays > 3) {
        // Due in 7 days
        alertType = 'due_soon_7d';
        alertTitle = `Recordatorio de Entrega (7 días): ${doc.title}`;
        alertMsg = `Tiene 7 días de plazo para revisar y entregar el documento "${doc.title}".`;
      }

      if (alertType) {
        // Check if an alert of this exact type was already sent in the last 20 hours to prevent duplicate spam
        const alreadySent = existingNotifs.some(
          (n) =>
            n.userId === user.id &&
            n.assignmentId === asg.id &&
            n.type === alertType &&
            now - new Date(n.createdAt).getTime() < 20 * 60 * 60 * 1000
        );

        if (!alreadySent) {
          NotificationRepository.create({
            userId: user.id,
            userEmail: user.email,
            title: alertTitle,
            message: alertMsg,
            type: alertType,
            documentId: doc.id,
            documentTitle: doc.title,
            assignmentId: asg.id,
            emailContent: {
              to: user.email,
              subject: `[GestiónDoc] ${alertTitle}`,
              bodyText: `Estimado/a ${user.name},\n\n${alertMsg}\n\nFecha límite registrada: ${new Date(asg.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}\n\nAtentamente,\nEquipo de Notificaciones de GestiónDoc Enterprise`,
            },
          });
          generated++;
        }
      }
    }

    return { alertsGenerated: generated };
  },
};
