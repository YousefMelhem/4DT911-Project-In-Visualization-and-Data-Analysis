import { ref } from 'vue'

export interface Notification {
    id: number
    type: 'success' | 'error' | 'confirm'
    title: string
    msg: string
    duration?: number
    onConfirm?: () => void
    onCancel?: () => void
}
const notif = ref<Notification[]>([])
let notifId = 0

export const UseNotification = () => {
    const addnotification = (notification: Omit<Notification, 'id'>) => {
        const id = notifId++
        const newNotif = { ...notification, id }
        notif.value.push(newNotif)
        if (notification.type != 'confirm') {
            const duration = notification.duration || 10000
            setTimeout(() => {
                removeNotification(id)
            }, duration)
        }
        return id
    }

    const removeNotification = (id: number) => {
        const i = notif.value.findIndex(a => a.id == id)
        if (i > -1) {
            notif.value.splice(i, 1)
        }
    }
    const error = (
        title: string,
        msg: string,
        duration?: number
    ) => {
        return addnotification({
            type: 'error',
            title,
            msg,
            duration
        })

    }

    const success = (
        title: string,
        msg: string,
        duration?: number
    ) => {
        return addnotification({
            type: 'success',
            title,
            msg,
            duration
        })

    }
    const confirm = (
        title: string,
        msg: string,
        onConfirm: () => void,
        onCancel?: () => void
    ) => {
        return addnotification({
            type: 'confirm',
            title,
            msg,
            onConfirm,
            onCancel
        })

    }

    return {
        notif,
        addnotification,
        removeNotification,
        error,
        success,
        confirm

    }
}