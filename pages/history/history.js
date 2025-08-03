// history.js
Page({
  data: {
    records: [],
    filteredRecords: [],
    filterType: 'all',
    filterOptions: [
      { label: '全部类型', value: 'all' },
      { label: '裂纹', value: '裂纹' },
      { label: '气泡', value: '气泡' },
      { label: '变形', value: '变形' },
      { label: '划痕', value: '划痕' },
      { label: '污渍', value: '污渍' },
      { label: '缺釉', value: '缺釉' }
    ],
    filterIndex: 0,
    sortIndex: 0,
    sortOptions: [
      { label: '时间降序', value: 'time_desc' },
      { label: '时间升序', value: 'time_asc' },
      { label: '严重程度', value: 'severity' }
    ],
    showDetail: false,
    selectedRecord: null,
    severityColors: {
      '正常': '#4CAF50',
      '可补瓷': '#FF9800',
      '需丢弃': '#f44336'
    }
  },

  onLoad() {
    this.loadRecords()
  },

  onShow() {
    this.loadRecords()
  },

  // 加载记录数据
  loadRecords() {
    try {
      const records = wx.getStorageSync('ceramic_records') || []
      
      // 格式化数据
      const formattedRecords = records.map(record => {
        // 处理缺陷类型显示
        let defectTypeDisplay = ''
        if (Array.isArray(record.defectType)) {
          defectTypeDisplay = record.defectType.join('、')
        } else if (record.defectType) {
          defectTypeDisplay = record.defectType
        }
        
        // 获取严重程度颜色
        const severityColor = this.data.severityColors[record.severity] || '#999'
        
        return {
          ...record,
          formatTime: this.formatTime(record.createTime),
          defectTypeDisplay: defectTypeDisplay,
          severityColor: severityColor
        }
      })

      this.setData({
        records: formattedRecords
      }, () => {
        this.applyFilters()
      })
    } catch (error) {
      console.error('加载记录失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 格式化时间
  formatTime(timeString) {
    const date = new Date(timeString)
    const now = new Date()
    const diff = now - date
    
    // 小于1分钟
    if (diff < 60000) {
      return '刚刚'
    }
    
    // 小于1小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`
    }
    
    // 小于1天
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`
    }
    
    // 超过1天，显示具体日期
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    
    return `${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  },

  // 缺陷类型筛选改变
  onFilterChange(e) {
    const index = e.detail.value
    const filterType = this.data.filterOptions[index].value
    
    this.setData({
      filterIndex: index,
      filterType: filterType
    }, () => {
      this.applyFilters()
    })
  },

  // 排序方式改变
  onSortChange(e) {
    this.setData({
      sortIndex: e.detail.value
    }, () => {
      this.applyFilters()
    })
  },

  // 应用筛选和排序
  applyFilters() {
    let filtered = [...this.data.records]
    
    // 应用类型筛选
    if (this.data.filterType !== 'all') {
      filtered = filtered.filter(record => {
        // 支持多选的缺陷类型
        if (Array.isArray(record.defectType)) {
          return record.defectType.includes(this.data.filterType)
        }
        return record.defectType === this.data.filterType
      })
    }
    
    // 应用排序
    const sortType = this.data.sortOptions[this.data.sortIndex].value
    switch (sortType) {
      case 'time_desc':
        filtered.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
        break
      case 'time_asc':
        filtered.sort((a, b) => new Date(a.createTime) - new Date(b.createTime))
        break
      case 'severity':
        // 按严重程度排序：需丢弃 > 可补瓷 > 正常
        const severityOrder = { '需丢弃': 3, '可补瓷': 2, '正常': 1 }
        filtered.sort((a, b) => {
          const aOrder = severityOrder[a.severity] || 0
          const bOrder = severityOrder[b.severity] || 0
          return bOrder - aOrder
        })
        break
    }
    
    this.setData({
      filteredRecords: filtered
    })
  },

  // 查看记录详情
  viewRecord(e) {
    const record = e.currentTarget.dataset.record
    this.setData({
      selectedRecord: record,
      showDetail: true
    })
  },

  // 隐藏详情
  hideDetail() {
    this.setData({
      showDetail: false,
      selectedRecord: null
    })
  },

  // 删除记录
  deleteRecord(e) {
    const recordId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条记录吗？',
      confirmText: '删除',
      confirmColor: '#f44336',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(recordId)
        }
      }
    })
  },

  // 执行删除操作
  performDelete(recordId) {
    try {
      const records = wx.getStorageSync('ceramic_records') || []
      const filteredRecords = records.filter(record => record.id !== recordId)
      
      wx.setStorageSync('ceramic_records', filteredRecords)
      
      // 同时删除已上传记录中的ID
      const uploadedIds = wx.getStorageSync('uploaded_record_ids') || []
      const newUploadedIds = uploadedIds.filter(id => id !== recordId)
      wx.setStorageSync('uploaded_record_ids', newUploadedIds)
      
      // 隐藏详情模态框
      this.hideDetail()
      
      // 重新加载数据
      this.loadRecords()
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('删除记录失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      })
    }
  },

  // 跳转到数据收集页面
  goToCollect() {
    wx.switchTab({
      url: '/pages/collect/collect'
    })
  }
})