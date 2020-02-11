import React, {createRef, useEffect, useState} from 'react';
import {SafeAreaView, Text, TouchableOpacity, View} from 'react-native';
import {TextInput} from 'react-native-gesture-handler';
import {useIsFocused} from 'react-navigation-hooks';
import {DDS, db} from '../../../App';
import {opacity, pv, SIZE, WEIGHT} from '../../common/common';
import {Header} from '../../components/header';
import {useTracked} from '../../provider';
import {eSubscribeEvent, eUnSubscribeEvent} from '../../services/eventManager';
import {eLoginDialogNavigateBack} from '../../services/events';

const _email = createRef();
const _pass = createRef();
const _username = createRef();

import {
  validateUsername,
  validateEmail,
  validatePass,
} from '../../services/validation';
import Icon from 'react-native-vector-icons/Feather';
import {ToastEvent} from '../../utils/utils';
import {ACTIONS} from '../../provider/actions';
export const Signup = ({navigation}) => {
  const [state, dispatch] = useTracked();
  const {colors, isLoginNavigator} = state;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [invalidUsername, setInvalidUsername] = useState(false);
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [invalidPassword, setInvalidPassword] = useState(false);

  let isFocused = useIsFocused();

  const handleBackPress = () => {
    navigation.goBack();
  };

  useEffect(() => {
    eSubscribeEvent(eLoginDialogNavigateBack, handleBackPress);
    return () => {
      eUnSubscribeEvent(eLoginDialogNavigateBack, handleBackPress);
    };
  }, [isFocused]);

  const _signUp = async () => {
    if (!invalidEmail && !invalidPassword && !invalidUsername) {
      try {
        await db.user.signup(username, email, password);
      } catch (e) {
        console.log(e, 'signup');
      }

      let user;

      try {
        user = await db.user.user.get();
        dispatch({type: ACTIONS.USER, user: user});
      } catch (e) {
        console.log('e', 'getUSer');
      }

      console.log(user);
    } else {
      ToastEvent.show('Signup failed', 'error');
    }
  };

  return (
    <SafeAreaView
      style={{
        height: '100%',
        backgroundColor: colors.bg,
      }}>
      <Header
        isLoginNavigator={isLoginNavigator}
        navigation={navigation}
        colors={colors}
        heading="Create Account"
      />

      <View
        style={{
          justifyContent: DDS.isTab ? 'center' : 'flex-start',
          width: DDS.isTab ? '80%' : '100%',
          height: DDS.isTab ? '80%' : '100%',
          alignSelf: 'center',
        }}>
        <View>
          <Text
            style={{
              textAlign: 'right',
              marginHorizontal: 12,
              fontFamily: WEIGHT.regular,

              textAlignVertical: 'bottom',

              position: 'absolute',
              right: 5,
              top: 2.5,
            }}>
            {invalidUsername ? (
              <Icon
                name="alert-circle"
                size={SIZE.xs}
                color={colors.errorText}
              />
            ) : null}
          </Text>

          <TextInput
            ref={_username}
            onFocus={() => {
              if (!invalidUsername) {
                _username.current.setNativeProps({
                  style: {
                    borderColor: colors.accent,
                  },
                });
              }
            }}
            defaultValue={username}
            onBlur={() => {
              if (!validateUsername(username)) {
                setInvalidUsername(true);
                _username.current.setNativeProps({
                  style: {
                    color: colors.errorText,
                    borderColor: colors.errorText,
                  },
                });
              } else {
                _username.current.setNativeProps({
                  style: {
                    borderColor: colors.nav,
                  },
                });
              }
            }}
            textContentType="username"
            onChangeText={value => {
              setUsername(value);

              if (invalidUsername && validateUsername(username)) {
                setInvalidUsername(false);
                _username.current.setNativeProps({
                  style: {
                    color: colors.pri,
                    borderColor: colors.accent,
                  },
                });
              }
            }}
            onSubmitEditing={() => {
              if (!validateUsername(username)) {
                setInvalidUsername(true);
                _username.current.setNativeProps({
                  style: {
                    color: colors.errorText,
                  },
                });
              }
            }}
            style={{
              padding: pv,
              borderWidth: 1.5,
              borderColor: colors.nav,
              marginHorizontal: 12,
              borderRadius: 5,
              fontSize: SIZE.sm,
              fontFamily: WEIGHT.regular,
            }}
            placeholder="Username (a-z _- 0-9)"
            placeholderTextColor={colors.icon}
          />

          <View
            style={{
              marginTop: 15,
            }}>
            <Text
              style={{
                textAlign: 'right',
                marginHorizontal: 12,
                fontFamily: WEIGHT.regular,

                textAlignVertical: 'bottom',

                position: 'absolute',
                right: 5,
                top: 2.5,
              }}>
              {invalidEmail ? (
                <Icon
                  name="alert-circle"
                  size={SIZE.xs}
                  color={colors.errorText}
                />
              ) : null}
            </Text>

            <TextInput
              ref={_email}
              onFocus={() => {
                if (!invalidEmail) {
                  _email.current.setNativeProps({
                    style: {
                      borderColor: colors.accent,
                    },
                  });
                }
              }}
              defaultValue={email}
              onBlur={() => {
                if (!validateEmail(email)) {
                  setInvalidEmail(true);
                  _email.current.setNativeProps({
                    style: {
                      color: colors.errorText,
                      borderColor: colors.errorText,
                    },
                  });
                } else {
                  _email.current.setNativeProps({
                    style: {
                      borderColor: colors.nav,
                    },
                  });
                }
              }}
              textContentType="emailAddress"
              onChangeText={value => {
                setEmail(value);
                if (invalidEmail && validateEmail(email)) {
                  setInvalidEmail(false);
                  _email.current.setNativeProps({
                    style: {
                      color: colors.pri,
                      borderColor: colors.accent,
                    },
                  });
                }
              }}
              onSubmitEditing={() => {
                if (!validateEmail(email)) {
                  setInvalidEmail(true);
                  _email.current.setNativeProps({
                    style: {
                      color: colors.errorText,
                    },
                  });
                }
              }}
              style={{
                padding: pv,
                borderWidth: 1.5,
                borderColor: colors.nav,
                marginHorizontal: 12,
                borderRadius: 5,
                fontSize: SIZE.sm,
                fontFamily: WEIGHT.regular,
              }}
              placeholder="Email"
              placeholderTextColor={colors.icon}
            />
          </View>

          <View
            style={{
              marginTop: 15,
              marginBottom: 15,
            }}>
            <Text
              style={{
                textAlign: 'right',
                marginHorizontal: 12,
                fontFamily: WEIGHT.regular,

                textAlignVertical: 'bottom',
                position: 'absolute',
                right: 5,
                top: 2.5,
              }}>
              {invalidPassword ? (
                <Icon
                  name="alert-circle"
                  size={SIZE.xs}
                  color={colors.errorText}
                />
              ) : null}
            </Text>
            <TextInput
              ref={_pass}
              onFocus={() => {
                if (!invalidPassword) {
                  _pass.current.setNativeProps({
                    style: {
                      borderColor: colors.accent,
                    },
                  });
                }
              }}
              defaultValue={password}
              onBlur={() => {
                if (!validatePass(password)) {
                  setInvalidPassword(true);
                  _pass.current.setNativeProps({
                    style: {
                      color: colors.errorText,
                      borderColor: colors.errorText,
                    },
                  });
                } else {
                  _pass.current.setNativeProps({
                    style: {
                      borderColor: colors.nav,
                    },
                  });
                }
              }}
              onChangeText={value => {
                setPassword(value);

                if (invalidPassword && validatePass(password)) {
                  setInvalidPassword(false);
                  _pass.current.setNativeProps({
                    style: {
                      color: colors.pri,
                      borderColor: colors.accent,
                    },
                  });
                }
              }}
              onSubmitEditing={() => {
                if (!validatePass(password)) {
                  setInvalidPassword(true);
                  _pass.current.setNativeProps({
                    style: {
                      color: colors.errorText,
                    },
                  });
                }
              }}
              style={{
                padding: pv,
                borderWidth: 1.5,
                borderColor: colors.nav,
                marginHorizontal: 12,
                borderRadius: 5,
                fontSize: SIZE.sm,
                fontFamily: WEIGHT.regular,
              }}
              secureTextEntry={true}
              placeholder="Password"
              placeholderTextColor={colors.icon}
            />
          </View>
          <TouchableOpacity
            activeOpacity={opacity}
            onPress={_signUp}
            style={{
              padding: pv,
              backgroundColor: colors.accent,
              borderRadius: 5,
              marginHorizontal: 12,
              marginBottom: 10,
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontSize: SIZE.md,
                fontFamily: WEIGHT.medium,
                color: 'white',
              }}>
              Signup
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

Signup.navigationOptions = {
  header: null,
  headerStyle: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    height: 0,
  },
};

export default Signup;
