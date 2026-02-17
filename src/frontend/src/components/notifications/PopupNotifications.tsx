import { useEffect, useState } from 'react';
import { X, AlertCircle, Bell } from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  type: 'alert' | 'report';
}

let notificationQueue: Notification[] = [];
let listeners: Array<(notifications: Notification[]) => void> = [];

export function showNotification(message: string, type: 'alert' | 'report' = 'alert') {
  const notification: Notification = {
    id: `${Date.now()}-${Math.random()}`,
    message,
    type,
  };
  
  notificationQueue = [...notificationQueue, notification];
  listeners.forEach(listener => listener(notificationQueue));
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    dismissNotification(notification.id);
  }, 5000);
}

export function dismissNotification(id: string) {
  notificationQueue = notificationQueue.filter(n => n.id !== id);
  listeners.forEach(listener => listener(notificationQueue));
}

export default function PopupNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  useEffect(() => {
    const listener = (newNotifications: Notification[]) => {
      setNotifications(newNotifications);
    };
    
    listeners.push(listener);
    
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${
            notification.type === 'report' 
              ? 'bg-destructive text-destructive-foreground' 
              : 'bg-gov-blue text-white'
          } p-4 rounded-lg shadow-lg flex items-start gap-3 animate-in slide-in-from-right`}
        >
          {notification.type === 'report' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <Bell className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="flex-1 font-medium">{notification.message}</p>
          <button
            onClick={() => dismissNotification(notification.id)}
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
