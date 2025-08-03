// pages/login/login.js
Page({
  data: {
    canIUseGetUserProfile: false
  },

  onLoad() {
    // 检查是否支持 getUserProfile
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }

    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      // 已登录，直接跳转到主页
      this.navigateToHome()
    }
  },

  // 微信登录
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于记录数据收集者信息',
      success: (res) => {
        console.log('登录成功:', res.userInfo)
        
        // 保存用户信息
        wx.setStorageSync('userInfo', res.userInfo)
        
        // 显示成功提示
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        })
        
        // 跳转到主页
        setTimeout(() => {
          this.navigateToHome()
        }, 1500)
      },
      fail: (err) => {
        console.error('登录失败:', err)
        wx.showToast({
          title: '需要授权才能使用',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 跳转到主页
  navigateToHome() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})