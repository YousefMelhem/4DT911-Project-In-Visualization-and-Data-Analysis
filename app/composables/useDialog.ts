import { reactive } from 'vue'

type DialogType = 'error' | 'success' | 'warning'
type Options = { 
  autoCloseMs?: number
  onConfirm?: () => void
  onCancel?: () => void
}

const state = reactive({
  open: false,
  type: 'error' as DialogType,
  title: '',
  message: '',
  options: {} as Options,
  resolver: undefined as undefined | ((v: boolean) => void),
})

export function useDialog() {
  function error(title: string, message: string, opts?: Options) {
    state.type = 'error'
    state.title = title
    state.message = message
    state.options = opts ?? {}
    state.open = true
    return new Promise<boolean>(r => { state.resolver = r })
  }

  function success(title: string, message: string, opts?: Options) {
    state.type = 'success'
    state.title = title
    state.message = message
    state.options = opts ?? {}
    state.open = true
    
    // Auto-close success after 3 seconds
    setTimeout(() => {
      if (state.open && state.type === 'success') {
        close(true)
      }
    }, opts?.autoCloseMs ?? 1000)
    
    return new Promise<boolean>(r => { state.resolver = r })
  }

  function warning(title: string, message: string, opts?: Options) {
    state.type = 'warning'
    state.title = title
    state.message = message
    state.options = opts ?? {}
    state.open = true
    return new Promise<boolean>(r => { state.resolver = r })
  }

  function close(result = false) {
    state.open = false
    
    if (result && state.options.onConfirm) {
      state.options.onConfirm()
    } else if (!result && state.options.onCancel) {
      state.options.onCancel()
    }
    
    state.resolver?.(result)
    state.resolver = undefined
  }

  return { state, error, success, warning, close }
}