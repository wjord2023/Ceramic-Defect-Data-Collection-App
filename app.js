// app.js
App({
  onLaunch() {
    console.log('陶瓷缺陷数据收集小程序启动')
    
    // 检查并初始化存储
    this.initStorage()
    
    // 检查更新
    this.checkForUpdate()
    
    // 获取系统信息
    this.getSystemInfo()
    
    // 初始化收集者信息
    this.initCollectorInfo()
  },

  onShow() {
    console.log('小程序进入前台')
  },

  onHide() {
    console.log('小程序进入后台')
  },

  onError(msg) {
    console.error('小程序发生错误:', msg)
  },

  // 初始化本地存储
  initStorage() {
    try {
      // 检查是否首次启动
      const isFirstLaunch = wx.getStorageSync('first_launch')
      if (!isFirstLaunch) {
        // 首次启动，初始化数据
        wx.setStorageSync('ceramic_records', [])
        wx.setStorageSync('first_launch', false)
        wx.setStorageSync('install_time', new Date().toISOString())
        
        console.log('首次启动，初始化完成')
      }
      
      // 检查数据完整性
      const records = wx.getStorageSync('ceramic_records')
      if (!Array.isArray(records)) {
        wx.setStorageSync('ceramic_records', [])
      }
      
    } catch (error) {
      console.error('初始化存储失败:', error)
    }
  },

  // 初始化收集者信息
  initCollectorInfo() {
    const collectorName = wx.getStorageSync('collector_name')
    if (!collectorName) {
      // 首次使用，生成默认名称或提示用户设置
      const defaultName = `用户${Date.now().toString().slice(-6)}`
      wx.setStorageSync('collector_name', defaultName)
      console.log('设置默认收集者名称:', defaultName)
    }
  },

  // 检查小程序更新
  checkForUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.log('发现新版本')
        }
      })
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })
      
      updateManager.onUpdateFailed(() => {
        console.error('更新失败')
      })
    }
  },

  // 获取系统信息
  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res
        console.log('系统信息:', res)
      },
      fail: (err) => {
        console.error('获取系统信息失败:', err)
      }
    })
  },

  // 全局数据
  globalData: {
    systemInfo: null
  },

  // 工具方法
  utils: {
    // 格式化文件大小
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },

    // 生成唯一ID
    generateId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2)
    },

    // 防抖函数
    debounce(func, wait) {
      let timeout
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout)
          func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
      }
    },

    // 节流函数
    throttle(func, limit) {
      let inThrottle
      return function() {
        const args = arguments
        const context = this
        if (!inThrottle) {
          func.apply(context, args)
          inThrottle = true
          setTimeout(() => inThrottle = false, limit)
        }
      }
    }
  }
})