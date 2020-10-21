module.exports = {
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testEnvironmentOptions: {
    url: "https://app.vk-apps.com/vkapps/index.html?v=3&vk_access_token_settings=&vk_app_id=6739175&vk_are_notifications_enabled=1&vk_is_app_user=1&vk_is_favorite=0&vk_language=ru&vk_platform=desktop_web&vk_ref=other&vk_ts=1603280211&vk_user_id=19039187&sign=FAKESOGN"
  }
};
