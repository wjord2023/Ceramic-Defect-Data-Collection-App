// collect.js
Page({
  data: {
    imageUrl: '',
    selectedDefect: '',
    showSuccess: false,
    defectTypes: [
      { id: 1, name: '裂纹' },
      { id: 2, name: '气泡' },
      { id: 3, name: '变形' },
      { id: 4, name: '划痕' },
      { id: 5, name: '污渍' },
      { id: 6, name: '缺釉' },
      { id: 7, name: '正常' }
    ]
  },

  // 计算是否可以提交
  get canSubmit() {
    return this.data.imageUrl && this.data.selectedDefect
  },

  onLoad() {
    // 页面加载时更新提交按钮状态
    this.updateSubmitState()
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
        }, () => {
          that.updateSubmitState()
        })
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
          }, () => {
            this.updateSubmitState()
          })
        }
      }
    })
  },

  // 选择缺陷类型
  selectDefect(e) {
    const defectType = e.currentTarget.dataset.defect
    this.setData({
      selectedDefect: defectType
    }, () => {
      this.updateSubmitState()
    })
  },

  // 更新提交按钮状态
  updateSubmitState() {
    const canSubmit = this.data.imageUrl && this.data.selectedDefect
    this.setData({
      canSubmit
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
        defectType: this.data.selectedDefect,
        createTime: new Date().toISOString(),
        location: await this.getCurrentLocation()
      }

      // 保存到本地存储
      const records = wx.getStorageSync('ceramic_records') || []
      records.unshift(record) // 添加到数组开头
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
    return new Promise((resolve, reject) => {
      const fileName = `ceramic_${Date.now()}.jpg`
      wx.saveFile({
        tempFilePath,
        success(res) {
          resolve(res.savedFilePath)
        },
        fail(err) {
          // 如果保存失败，直接使用临时路径
          console.warn('保存图片失败，使用临时路径:', err)
          resolve(tempFilePath)
        }
      })
    })
  },

  // 获取当前位置（可选）
  getCurrentLocation() {
    return new Promise((resolve) => {
      wx.getLocation({
        type: 'gcj02',
        success(res) {
          resolve({
            latitude: res.latitude,
            longitude: res.longitude
          })
        },
        fail() {
          resolve(null)
        }
      })
    })
  },

  // 继续采集
  continueCollect() {
    this.setData({
      imageUrl: '',
      selectedDefect: '',
      showSuccess: false
    }, () => {
      this.updateSubmitState()
    })
  },

  // 隐藏成功提示
  hideSuccess() {
    this.setData({
      showSuccess: false
    })
  }
})