// index.js
const app = getApp()

Page({
  data: {
    totalCount: 0,
    todayCount: 0,
    cloudCount: 0,
    localCount: 0,
    uploading: false,
    uploadStatus: '',
    uploadStatusText: '待上传',
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
    this.initCloud()
    this.loadStatistics()
  },

  onShow() {
    this.loadStatistics()
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
      records.forEach(record => {
        if (typeStats[record.defectType]) {
          typeStats[record.defectType]++
        } else {
          typeStats[record.defectType] = 1
        }
      })

      // 更新缺陷类型统计
      const defectTypes = this.data.defectTypes.map(type => {
        const count = typeStats[type.name] || 0
        const percentage = records.length > 0 ? (count / records.length * 100) : 0
        return {
          ...type,
          count,
          percentage: Math.round(percentage)
        }
      })

      this.setData({
        defectTypes,
        uploadStatusText: localRecords.length > 0 ? `${localRecords.length}条待上传` : '数据已同步'
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
      uploading: true,
      uploadStatus: '',
      uploadStatusText: '准备上传...'
    })

    try {
      const records = wx.getStorageSync('ceramic_records') || []
      const uploadedIds = wx.getStorageSync('uploaded_record_ids') || []
      
      // 筛选出未上传的记录
      const localRecords = records.filter(record => !uploadedIds.includes(record.id))
      
      if (localRecords.length === 0) {
        this.setData({
          uploading: false,
          uploadStatus: 'success',
          uploadStatusText: '数据已同步'
        })
        return
      }

      let successCount = 0
      let failCount = 0

      // 批量上传数据
      for (let i = 0; i < localRecords.length; i++) {
        const record = localRecords[i]
        
        this.setData({
          uploadStatusText: `上传中... ${i + 1}/${localRecords.length}`
        })

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
            defectType: record.defectType,
            imagePath: cloudImageUrl,
            createTime: record.createTime,
            location: record.location || null,
            uploadTime: new Date().toISOString()
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
        this.setData({
          uploadStatus: 'success',
          uploadStatusText: '上传成功！'
        })
        wx.showToast({
          title: `成功上传${successCount}条数据`,
          icon: 'success'
        })
      } else {
        this.setData({
          uploadStatus: 'error',
          uploadStatusText: `成功${successCount}条，失败${failCount}条`
        })
        wx.showToast({
          title: `部分上传失败`,
          icon: 'error'
        })
      }

      // 重新加载统计数据
      this.loadStatistics()

    } catch (error) {
      console.error('批量上传失败:', error)
      this.setData({
        uploadStatus: 'error',
        uploadStatusText: '上传失败'
      })
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