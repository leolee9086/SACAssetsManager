export const GLOBAL_STUN_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.ekiga.net' },
    { urls: 'stun:stun.ideasip.com' },
    { urls: 'stun:stun.schlund.de' },
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.voiparound.com' },
    { urls: 'stun:stun.voipbuster.com' },
    { urls: 'stun:openrelay.metered.ca:80' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.counterpath.com:3478' },
    { urls: 'stun:stun.sipgate.net' },
    { urls: 'stun:stun.internetcalls.com' },
    { urls: 'stun:stun.voxgratia.org' }
]

export const ASIA_PACIFIC_STUN_TURN_SERVERS =[
    // 阿里云STUN服务器
    { urls: 'stun:stun.aliyun.com:3478' },
    
    // 腾讯云STUN服务器
    { urls: 'stun:stun.qq.com:3478' },
    
    // 百度云STUN服务器
    { urls: 'stun:stun.baidu.com:3478' },
    
    // TURN服务器示例 (需填入你的实际账号信息)
    {
      urls: 'turn:turn.aliyun.com:3478',
      username: '请替换为你的账号',
      credential: '请替换为你的密码'
    },
    {
      urls: 'turn:turn.tencent.com:3478',
      username: '请替换为你的账号',
      credential: '请替换为你的密码'
    }
  ]