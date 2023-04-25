// ** React Imports
import { createContext, useState, ReactNode, useCallback, useEffect } from 'react'

// ** Services
import { AccountSettingTypes, MessageType } from '../types'

// ** Defaults
const defaultProvider: AccountSettingTypes = {
  initialState: {},
  suggestion: '',
  generate: ''
}

const AccountSettingContext = createContext(defaultProvider)

type Props = {
  children: ReactNode
}

const AccountSettingProvider = ({ children }: Props) => {
  const [initialState, setInitialState] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [generate, setGenerate] = useState('')

  const handleMessagesFromExtension = useCallback(
    (event: MessageEvent<MessageType>) => {
      const payload = event.data.data
      switch (event.data.type) {
        case 'initData':
          setInitialState({ ...payload })
          break
        case 'onSuggestionClicked:Response':
          setSuggestion({ ...payload })
          break
        case 'onSuggestionClickedGPT:Response':
          const gptResponse = payload.choices[0].message.content
          setSuggestion(gptResponse)
          break
        case 'onGenerateClickedGPT:Response':
          break
        case 'onGenerateClicked:Response':
          break
        case 'onGenerateClicked:Error':
          break
        case 'onSuggestionClicked:Error':
          break
        case 'onDiscardSuggestionClicked:Success':
          break
        case 'onDiscardSuggestionClicked:Error':
          break
        case 'onEndorseSuggestionClicked:Success':
          break
        case 'onEndorseSuggestionClicked:Error':
          break
      }
    },
    [setInitialState, setSuggestion]
  )

  useEffect(() => {
    window.addEventListener('message', (event: MessageEvent<MessageType>) => {
      handleMessagesFromExtension(event)
    })

    return () => {
      window.removeEventListener('message', handleMessagesFromExtension)
    }
  }, [handleMessagesFromExtension])

  const values = {
    initialState,
    suggestion,
    generate
  }

  return <AccountSettingContext.Provider value={values}>{children}</AccountSettingContext.Provider>
}

export { AccountSettingContext, AccountSettingProvider }