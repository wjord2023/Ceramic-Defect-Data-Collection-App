// collect.js
Page({
  data: {
    imageUrl: '',
    selectedDefects: [],
    selectedSeverity: '', // 严重程度
    showSuccess: false,
    canSubmit: false,
    userInfo: null,
    severityTypes: [
      { id: 1, name: '正常', color: '#4CAF50' },
      { id: 2, name: '可补瓷', color: '#FF9800' },
      { id: 3, name: '需丢弃', color: '#f44336' }
    ],
    defectTypes: [
      { id: 1, name: '裂纹', selected: false },
      { id: 2, name: '气泡', selected: false },
      { id: 3, name: '变形', selected: false },
      { id: 4, name: '划痕', selected: false },
      { id: 5, name: '污渍', selected: false },
      { id: 6, name: '缺釉', selected: false }
    ]
  },

  onLoad() {
    // 获取用户信息
    this.getUserInfo()
    // 加载上次的严重程度
    this.loadLastSeverity()
    // 更新提交按钮状态
    this.updateSubmitState()
  },

  // 获取用户信息
  getUserInfo() {
    // 从缓存获取用户信息
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
    } else {
      // 如果没有登录信息，跳转回登录页
      wx.redirectTo({
        url: '/pages/login/login'
      })
    }
  },

  // 加载上次的严重程度
  loadLastSeverity() {
    const lastSeverity = wx.getStorageSync('lastSeverity')
    if (lastSeverity) {
      this.setData({
        selectedSeverity: lastSeverity
      })
    }
  },

  // 拍照功能
  takePhoto() {
    const that = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'back',
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath
        that.setData({
          imageUrl: tempFilePath
        })
        that.updateSubmitState()
      },
      fail(err) {
        console.error('拍照失败:', err)
        wx.showToast({
          title: '拍照失败',
          icon: 'error'
        })
      }
    })
  },

  // 重新拍摄
  retakePhoto() {
    this.takePhoto()
  },

  // 删除照片
  deletePhoto() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            imageUrl: ''
          })
          this.updateSubmitState()
        }
      }
    })
  },

  // 选择严重程度
  selectSeverity(e) {
    const severity = e.currentTarget.dataset.severity
    this.setData({
      selectedSeverity: severity
    })
    
    // 保存到本地，下次默认选中
    wx.setStorageSync('lastSeverity', severity)
    
    // 如果选择了"正常"，清空缺陷类型选择
    if (severity === '正常') {
      const defectTypes = this.data.defectTypes.map(item => ({
        ...item,
        selected: false
      }))
      this.setData({
        defectTypes: defectTypes,
        selectedDefects: []
      })
    }
    
    this.updateSubmitState()
  },

  // 选择缺陷类型（支持多选）
  selectDefect(e) {
    // 如果严重程度是"正常"，不允许选择缺陷
    if (this.data.selectedSeverity === '正常') {
      wx.showToast({
        title: '正常产品无需选择缺陷',
        icon: 'none'
      })
      return
    }
    
    // 如果没有选择严重程度，提示先选择
    if (!this.data.selectedSeverity) {
      wx.showToast({
        title: '请先选择严重程度',
        icon: 'none'
      })
      return
    }
    
    const defectType = e.currentTarget.dataset.defect
    
    // 更新 defectTypes 数组中的 selected 状态
    const defectTypes = this.data.defectTypes.map(item => {
      if (item.name === defectType) {
        return { ...item, selected: !item.selected }
      }
      return item
    })
    
    // 更新 selectedDefects 数组
    const selectedDefects = defectTypes
      .filter(item => item.selected)
      .map(item => item.name)
    
    // 更新数据
    this.setData({
      defectTypes: defectTypes,
      selectedDefects: selectedDefects
    })
    
    this.updateSubmitState()
  },

  // 更新提交按钮状态
  updateSubmitState() {
    let canSubmit = false
    
    if (this.data.imageUrl && this.data.selectedSeverity) {
      if (this.data.selectedSeverity === '正常') {
        // 正常产品不需要选择缺陷类型
        canSubmit = true
      } else {
        // 其他严重程度需要至少选择一个缺陷类型
        canSubmit = this.data.selectedDefects.length > 0
      }
    }
    
    this.setData({
      canSubmit: canSubmit
    })
  },

  // 提交数据
  async submitData() {
    if (!this.data.canSubmit) {
      return
    }

    wx.showLoading({
      title: '保存中...'
    })

    try {
      // 保存图片到本地
      const savedImagePath = await this.saveImageToLocal(this.data.imageUrl)
      
      // 创建数据记录
      const record = {
        id: Date.now().toString(),
        imagePath: savedImagePath,
        severity: this.data.selectedSeverity, // 严重程度
        defectType: this.data.selectedDefects, // 缺陷类型数组
        createTime: new Date().toISOString(),
        collector: this.data.userInfo.nickName, // 收集者
        collectorAvatar: this.data.userInfo.avatarUrl // 收集者头像
      }

      // 保存到本地存储
      const records = wx.getStorageSync('ceramic_records') || []
      records.unshift(record)
      wx.setStorageSync('ceramic_records', records)

      wx.hideLoading()
      
      // 显示成功提示
      this.setData({
        showSuccess: true
      })

      // 3秒后自动隐藏成功提示
      setTimeout(() => {
        this.setData({
          showSuccess: false
        })
      }, 3000)

    } catch (error) {
      wx.hideLoading()
      console.error('保存数据失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
    }
  },

  // 保存图片到本地
  saveImageToLocal(tempFilePath) {
    return new Promise((resolve) => {
      const fileName = `ceramic_${Date.now()}.jpg`
      wx.saveFile({
        tempFilePath,
        success(res) {
          resolve(res.savedFilePath)
        },
        fail() {
          // 如果保存失败，直接使用临时路径
          resolve(tempFilePath)
        }
      })
    })
  },

  // 继续采集
  continueCollect() {
    // 重置所有选择状态，但保留严重程度
    const defectTypes = this.data.defectTypes.map(item => ({
      ...item,
      selected: false
    }))
    
    // 如果当前严重程度是"正常"，也要重置
    const shouldResetSeverity = this.data.selectedSeverity === '正常'
    
    this.setData({
      imageUrl: '',
      selectedDefects: [],
      showSuccess: false,
      defectTypes: defectTypes,
      selectedSeverity: shouldResetSeverity ? '' : this.data.selectedSeverity
    })
    this.updateSubmitState()
  },

  // 隐藏成功提示
  hideSuccess() {
    this.setData({
      showSuccess: false
    })
  }
})