// index.js
const app = getApp()

Page({
  data: {
    totalCount: 0,
    todayCount: 0,
    cloudCount: 0,
    localCount: 0,
    uploading: false,
    collectorName: '',
    showNameModal: false,
    tempName: '',
    defectTypes: [
      { id: 1, name: '裂纹', count: 0, percentage: 0 },
      { id: 2, name: '气泡', count: 0, percentage: 0 },
      { id: 3, name: '变形', count: 0, percentage: 0 },
      { id: 4, name: '划痕', count: 0, percentage: 0 },
      { id: 5, name: '污渍', count: 0, percentage: 0 },
      { id: 6, name: '缺釉', count: 0, percentage: 0 },
      { id: 7, name: '正常', count: 0, percentage: 0 }
    ]
  },

  onLoad() {
    this.initCollectorName()
    this.initCloud()
    this.loadStatistics()
  },

  onShow() {
    this.loadStatistics()
  },

  // 初始化收集者姓名
  initCollectorName() {
    const collectorName = wx.getStorageSync('collector_name') || `用户${Date.now().toString().slice(-6)}`
    this.setData({ collectorName })
  },

  // 显示姓名设置弹窗
  showNameSetting() {
    this.setData({
      showNameModal: true,
      tempName: this.data.collectorName
    })
  },

  // 隐藏姓名设置弹窗
  hideNameModal() {
    this.setData({
      showNameModal: false,
      tempName: ''
    })
  },

  // 阻止事件冒泡
  stopPropagation(e) {
    // 阻止事件冒泡，防止点击模态框内容时关闭弹窗
    e.stopPropagation && e.stopPropagation()
  },

  // 姓名输入
  onNameInput(e) {
    this.setData({
      tempName: e.detail.value
    })
  },

  // 保存姓名
  saveName() {
    const name = this.data.tempName.trim()
    if (!name) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      })
      return
    }

    if (name.length > 10) {
      wx.showToast({
        title: '姓名不能超过10个字符',
        icon: 'none'
      })
      return
    }

    try {
      wx.setStorageSync('collector_name', name)
      this.setData({
        collectorName: name,
        showNameModal: false,
        tempName: ''
      })

      wx.showToast({
        title: '设置成功',
        icon: 'success',
        duration: 1500
      })
    } catch (error) {
      console.error('保存姓名失败:', error)
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'error'
      })
    }
  },

  // 获取微信昵称
  getWechatName() {
    // 检查是否支持 getUserProfile
    if (!wx.getUserProfile) {
      wx.showToast({
        title: '当前版本不支持获取微信信息',
        icon: 'none'
      })
      return
    }

    wx.getUserProfile({
      desc: '获取微信昵称用于设置收集者姓名',
      success: (res) => {
        const nickName = res.userInfo.nickName || '微信用户'
        this.setData({
          tempName: nickName
        })
        wx.showToast({
          title: '已获取微信昵称',
          icon: 'success',
          duration: 1500
        })
      },
      fail: (err) => {
        console.error('获取微信信息失败:', err)
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showToast({
            title: '用户拒绝授权',
            icon: 'none'
          })
        } else {
          wx.showToast({
            title: '获取失败，请手动输入',
            icon: 'none'
          })
        }
      }
    })
  },

  // 初始化云开发
  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    
    wx.cloud.init({
      env: 'cloud1-7glrzg4922137845', // 请替换为你的云开发环境ID
      traceUser: true
    })
  },

  // 加载统计数据
  loadStatistics() {
    try {
      const records = wx.getStorageSync('ceramic_records') || []
      const uploadedIds = wx.getStorageSync('uploaded_record_ids') || []
      const today = new Date().toDateString()
      
      // 计算总数
      this.setData({
        totalCount: records.length
      })

      // 计算今日数量
      const todayRecords = records.filter(record => {
        const recordDate = new Date(record.createTime).toDateString()
        return recordDate === today
      })
      
      this.setData({
        todayCount: todayRecords.length
      })

      // 计算本地未上传数量和云端已上传数量
      const localRecords = records.filter(record => !uploadedIds.includes(record.id))
      
      this.setData({
        localCount: localRecords.length,
        cloudCount: uploadedIds.length
      })

      // 统计各类型数量
      const typeStats = {}
      const severityStats = {
        '正常': 0,
        '可补瓷': 0,
        '需丢弃': 0
      }
      
      records.forEach(record => {
        // 统计严重程度
        if (record.severity && severityStats.hasOwnProperty(record.severity)) {
          severityStats[record.severity]++
        }
        
        // 统计缺陷类型
        if (Array.isArray(record.defectType)) {
          record.defectType.forEach(type => {
            typeStats[type] = (typeStats[type] || 0) + 1
          })
        } else if (record.defectType) {
          // 兼容旧数据
          const type = record.defectType
          typeStats[type] = (typeStats[type] || 0) + 1
        }
      })

      // 更新缺陷类型统计（不包括"正常"）
      const defectTypes = this.data.defectTypes.map(type => {
        if (type.name === '正常') {
          // 正常类型从严重程度统计中获取
          const count = severityStats['正常']
          const percentage = records.length > 0 ? (count / records.length * 100) : 0
          return {
            ...type,
            count,
            percentage: Math.round(percentage)
          }
        } else {
          const count = typeStats[type.name] || 0
          const percentage = records.length > 0 ? (count / records.length * 100) : 0
          return {
            ...type,
            count,
            percentage: Math.round(percentage)
          }
        }
      })

      this.setData({
        defectTypes
      })

    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  // 一键上传全部数据
  async uploadAllData() {
    if (this.data.uploading || this.data.localCount === 0) {
      return
    }

    this.setData({
      uploading: true
    })

    try {
      const records = wx.getStorageSync('ceramic_records') || []
      const uploadedIds = wx.getStorageSync('uploaded_record_ids') || []
      
      // 筛选出未上传的记录
      const localRecords = records.filter(record => !uploadedIds.includes(record.id))
      
      if (localRecords.length === 0) {
        this.setData({
          uploading: false
        })
        return
      }

      let successCount = 0
      let failCount = 0

      // 批量上传数据
      for (let i = 0; i < localRecords.length; i++) {
        const record = localRecords[i]

        try {
          // 上传图片到云存储
          let cloudImageUrl = ''
          if (record.imagePath) {
            const cloudPath = `ceramic-images/${record.id}.jpg`
            const uploadResult = await wx.cloud.uploadFile({
              cloudPath,
              filePath: record.imagePath
            })
            cloudImageUrl = uploadResult.fileID
          }

          // 上传记录到云数据库
          const dbData = {
            recordId: record.id,
            severity: record.severity || '未分类',
            defectType: record.defectType,
            imagePath: cloudImageUrl,
            createTime: record.createTime,
            uploadTime: new Date().toISOString(),
            collector: record.collector || this.data.collectorName,
            collectorAvatar: record.collectorAvatar || ''
          }

          await wx.cloud.database().collection('ceramic_records').add({
            data: dbData
          })

          // 记录已上传的ID
          uploadedIds.push(record.id)
          successCount++

        } catch (error) {
          console.error('上传记录失败:', record.id, error)
          failCount++
        }
      }

      // 保存已上传的记录ID
      wx.setStorageSync('uploaded_record_ids', uploadedIds)

      // 更新状态
      if (failCount === 0) {
        wx.showToast({
          title: `成功上传${successCount}条数据`,
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: `成功${successCount}条，失败${failCount}条`,
          icon: 'none'
        })
      }

      // 重新加载统计数据
      this.loadStatistics()

    } catch (error) {
      console.error('批量上传失败:', error)
      wx.showToast({
        title: '上传失败',
        icon: 'error'
      })
    } finally {
      this.setData({
        uploading: false
      })
    }
  },

  // 跳转到数据收集页面
  goToCollect() {
    wx.switchTab({
      url: '/pages/collect/collect'
    })
  },

  // 跳转到历史记录页面
  goToHistory() {
    wx.switchTab({
      url: '/pages/history/history'
    })
  }
})