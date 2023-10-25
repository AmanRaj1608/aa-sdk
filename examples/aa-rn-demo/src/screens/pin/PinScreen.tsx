import React, {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";

import { useAlertContext } from "@context/alert";
import { useTurnkeyContext } from "@context/turnkey";
import { useAppNavigation } from "@hooks/useAppNavigation";
import { useAsyncEffect } from "@hooks/useAsyncEffect";
import { useCredentialProvider } from "@hooks/useCredentialProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import FormModal from "@shared-components/atom/FormModal";
import FormText from "@shared-components/atom/FormText";
import { colors } from "@theme/color";
import {
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import FingerprintScanner from "react-native-fingerprint-scanner";
import RNRestart from "react-native-restart";
import { Routes } from "types/navigation";
import { LocalStorageKey } from "types/storage";

const PIN_COUNT = 4;
const PIN_TRY_MAX = 10;

export type PinType = "set" | "auth" | "reset";

const CloseButton = (props: { onPress?: () => void }): ReactElement => {
  return (
    <View
      style={{
        height: 72,
        justifyContent: "center",
        alignItems: "flex-end",
        marginHorizontal: 20,
      }}
    >
      <TouchableOpacity
        style={{
          width: 38,
          height: 38,
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={(): void => {
          props.onPress && props.onPress();
        }}
      >
        <Ionicons name="close" size={28} color={colors.black._900} />
      </TouchableOpacity>
    </View>
  );
};

const PinTitle = (props: { title: string }): ReactElement => {
  return (
    <FormText
      font={"B"}
      size={20}
      color={colors.black._900}
      style={{ margin: 12 }}
    >
      {props.title}
    </FormText>
  );
};

const PinSubTitle = (props: {
  title?: string;
  warn?: boolean;
}): ReactElement => {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <FormText
        color={props.warn ? colors.red : colors.black._500}
        style={{ textAlign: "center" }}
      >
        {props.title}
      </FormText>
    </View>
  );
};
const PinForgot = (props: { onPress: () => void }): ReactElement => {
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", marginTop: 24 }}
      onPress={props.onPress}
    >
      <Ionicons
        name={"alert-circle-outline"}
        size={16}
        color={colors.black._500}
        style={{ marginRight: 4 }}
      />
      <FormText color={colors.black._500}>Forgot your PIN code?</FormText>
    </TouchableOpacity>
  );
};

const PinDot = (props: { fill: boolean }): ReactElement => {
  const backgroundColor = props.fill ? colors.primary._400 : colors.black._100;

  return (
    <View
      style={{
        width: 16,
        height: 16,
        backgroundColor,
        borderRadius: 16 / 2,
        margin: 14,
      }}
    />
  );
};

const PinButton = (
  props:
    | { value: string; handleInput: (value: string) => void }
    | { delete: boolean; handleDelete: () => void }
    | { disabled: boolean },
): ReactElement => {
  const [backgroundColor, setBackgroundColor] = useState<string | undefined>(
    undefined,
  );

  const onPressIn = (): void => {
    setBackgroundColor(colors.black._90005);

    if ("value" in props) {
      props.handleInput(props.value);
    }
    if ("delete" in props) {
      props.handleDelete();
    }
  };

  const onPressOut = (): void => {
    setTimeout(() => setBackgroundColor(undefined), 50);
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={"disabled" in props}
    >
      <View
        style={{
          width: 84,
          height: 64,
          borderRadius: 10,
          backgroundColor,
          alignItems: "center",
          justifyContent: "center",
          marginVertical: 12,
          marginHorizontal: 8,
        }}
      >
        {"delete" in props && (
          <Image
            source={require("../../assets/images/pin_delete.png")}
            style={{ width: 32, height: 32 }}
          />
        )}
        {"value" in props && (
          <FormText font={"B"} size={32} color={colors.black._900}>
            {props.value}
          </FormText>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const PinScreen = (): ReactElement => {
  const { navigation, params } = useAppNavigation<Routes.Pin>();
  const { type, result: resultCallback, cancel } = params;

  const [pinType, setPinType] = useState<PinType>(type);
  const { dispatchAlert } = useAlertContext();
  const { saveNewPin, resetNewPin, savePin, getNewPin, getPin, removeKeys } =
    useCredentialProvider();

  const [inputPin, setInputPin] = useState("");
  const [pinConfigurePhase, setPinConfigurePhase] = useState<
    "input" | "confirm" | "done"
  >("input");

  const [pinTryCount, setPinTryCount] = useState(0);
  const [visibleResetModal, setVisibleResetModal] = useState(false);

  const handleInput = (value: string): void => {
    if (inputPin.length >= PIN_COUNT) {
      return;
    }
    const n = inputPin + value;
    setInputPin(n);
  };

  const handleDelete = (): void => {
    if (inputPin.length <= 0 && inputPin.length >= PIN_COUNT) {
      return;
    }
    const n = inputPin.slice(0, -1);
    setInputPin(n);
  };

  const clearInputPin = (): void => {
    setInputPin("");
  };

  const initPinTryCount = async (): Promise<void> => {
    const count =
      (await AsyncStorage.getItem(LocalStorageKey.PIN_TRY_COUNT)) || "0";
    setPinTryCount(Number(count));
  };
  const increasePinTryCount = useCallback(async (): Promise<void> => {
    const count = pinTryCount + 1;
    setPinTryCount(count);
    await AsyncStorage.setItem(LocalStorageKey.PIN_TRY_COUNT, String(count));
  }, [pinTryCount]);
  const resetPinTryCount = async (): Promise<void> => {
    setVisibleResetModal(false);
    setPinTryCount(0);
    await AsyncStorage.setItem(LocalStorageKey.PIN_TRY_COUNT, String(0));
  };

  useFocusEffect(() => {
    initPinTryCount();
    type === "auth" && pinTryCount >= PIN_TRY_MAX && setVisibleResetModal(true);

    return () => {
      setVisibleResetModal(false);
    };
  });

  useEffect(() => {
    clearInputPin();
    resetNewPin();
    initPinTryCount();
  }, [resetNewPin]);

  useEffect(() => {
    type === "auth" && pinTryCount >= PIN_TRY_MAX && setVisibleResetModal(true);
  }, [pinTryCount, type]);

  useEffect(() => {
    setPinType(type);
  }, [type]);

  const { biometricType } = useTurnkeyContext();

  useAsyncEffect(async () => {
    if (pinType !== "auth" || biometricType === null) {
      return;
    }

    try {
      await FingerprintScanner.authenticate({
        description: `Sign in with ${biometricType}`,
        fallbackEnabled: true,
      });
      resultCallback && resultCallback(true);
    } catch (error) {
      console.log(error);
    }
  }, [pinType]);

  useEffect(() => {
    const handlePin = async (): Promise<void> => {
      switch (pinType) {
        case "auth":
          if (inputPin.length === 4) {
            const v = await getPin();
            const match = !v || inputPin === v;

            match ? resetPinTryCount() : increasePinTryCount();

            clearInputPin();
            resultCallback && resultCallback(match);
          }
          break;
        case "reset":
        case "set":
          if (inputPin.length === 4) {
            const newPin = await getNewPin();

            if (newPin === "") {
              await saveNewPin(inputPin);
              setPinConfigurePhase("confirm");
            } else {
              if (newPin === inputPin) {
                // match
                await savePin(inputPin);

                dispatchAlert({
                  type: "open",
                  alertType: "success",
                  message: "PIN code has been set up successfully.",
                });

                if (pinType !== "reset") {
                  setPinConfigurePhase("done");
                }

                resetPinTryCount();
                resultCallback && resultCallback(true);
              } else {
                dispatchAlert({
                  type: "open",
                  alertType: "error",
                  message: "Failed to set up PIN code.",
                });
                setPinConfigurePhase("input");
              }

              resetNewPin();
            }

            clearInputPin();
          }
          break;
      }
    };
    handlePin();
  }, [
    dispatchAlert,
    getNewPin,
    getPin,
    increasePinTryCount,
    inputPin,
    pinType,
    resetNewPin,
    resultCallback,
    saveNewPin,
    savePin,
  ]);

  const onResetPin = (): void => {
    removeKeys().then(() => RNRestart.restart());
  };

  const TITLE = {
    setup: { title: "Set up your PIN code" },
    confirm: { title: "Confirm your PIN code" },
    enter: { title: "Enter your PIN code" },
    none: { title: "" },
  };
  const TITLE_SUB = {
    setup: { title: "This action requires a PIN code setting." },
    confirm: { title: "" },
    enter: { title: "" },
    none: { title: "" },
  };

  const title =
    pinType === "auth"
      ? TITLE.enter
      : pinConfigurePhase === "input" // set or reset
      ? TITLE.setup
      : pinConfigurePhase === "confirm" // set or reset
      ? TITLE.confirm
      : TITLE.confirm;

  const subTitle =
    pinType === "auth"
      ? TITLE_SUB.enter
      : pinConfigurePhase === "input" // set or reset
      ? TITLE_SUB.setup
      : pinConfigurePhase === "confirm" // set or reset
      ? TITLE_SUB.confirm
      : TITLE_SUB.confirm;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <CloseButton onPress={cancel} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <PinTitle {...title} />
        {pinType !== "auth" && <PinSubTitle {...subTitle} />}
        {pinType === "auth" && pinTryCount > 0 ? (
          <PinSubTitle
            warn
            title={`Wrong PIN code (${pinTryCount}/${PIN_TRY_MAX})`}
          />
        ) : (
          <PinSubTitle title={" "} />
        )}
        {pinType === "auth" && pinTryCount >= PIN_TRY_MAX - 1 ? (
          <PinSubTitle
            warn
            title={
              "You have to reset your PIN code\nif you enter the wrong PIN code again."
            }
          />
        ) : (
          <PinSubTitle title={"\n"} />
        )}
        <View style={{ flexDirection: "row", marginVertical: 40 }}>
          {[...Array(PIN_COUNT).keys()].map((_, i) => (
            <PinDot fill={inputPin.length > i} key={i} />
          ))}
        </View>

        <View style={{ flexDirection: "row" }}>
          <PinButton value={"1"} handleInput={handleInput} />
          <PinButton value={"2"} handleInput={handleInput} />
          <PinButton value={"3"} handleInput={handleInput} />
        </View>
        <View style={{ flexDirection: "row" }}>
          <PinButton value={"4"} handleInput={handleInput} />
          <PinButton value={"5"} handleInput={handleInput} />
          <PinButton value={"6"} handleInput={handleInput} />
        </View>
        <View style={{ flexDirection: "row" }}>
          <PinButton value={"7"} handleInput={handleInput} />
          <PinButton value={"8"} handleInput={handleInput} />
          <PinButton value={"9"} handleInput={handleInput} />
        </View>
        <View style={{ flexDirection: "row" }}>
          <PinButton disabled />
          <PinButton value={"0"} handleInput={handleInput} />
          <PinButton delete handleDelete={handleDelete} />
        </View>
        {pinType === "auth" && <PinForgot onPress={onResetPin} />}
      </View>
      <FormModal
        visible={visibleResetModal}
        title={"Reset your PIN code"}
        message={`You need to reset the PIN code\nif you enter the wrong PIN code ${PIN_TRY_MAX} times.`}
        positive={{
          text: "Reset",
          callback: onResetPin,
        }}
        negative={{
          text: "Later",
          callback: (): void => {
            navigation.pop();
          },
        }}
      />
    </SafeAreaView>
  );
};

export default PinScreen;
