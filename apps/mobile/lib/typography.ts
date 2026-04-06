import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
} from '@expo-google-fonts/montserrat'
import { Text, TextInput } from 'react-native'

export const MONTSERRAT_FONTS = {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
}

let typographyDefaultsApplied = false

type DefaultPropsTarget = {
  defaultProps?: {
    style?: unknown
  }
}

export function applyGlobalTypographyDefaults() {
  if (typographyDefaultsApplied) {
    return
  }

  const textTarget = Text as unknown as DefaultPropsTarget
  const textInputTarget = TextInput as unknown as DefaultPropsTarget

  textTarget.defaultProps = {
    ...textTarget.defaultProps,
    style: [{ fontFamily: 'Montserrat_400Regular' }, textTarget.defaultProps?.style],
  }

  textInputTarget.defaultProps = {
    ...textInputTarget.defaultProps,
    style: [{ fontFamily: 'Montserrat_400Regular', fontSize: 16 }, textInputTarget.defaultProps?.style],
  }

  typographyDefaultsApplied = true
}
