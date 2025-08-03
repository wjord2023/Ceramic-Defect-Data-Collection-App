// history.js
Page({
  data: {
    records: [],
    filteredRecords: [],
    searchKeyword: '',
    filterType: 'all',
    sortIndex: 0,
    sortOptions: [
      { label: '时间降序', value: 'time_desc' },
      { label: '时间升序', value: 'time_asc' },
      { label: '缺陷类型', value: 'defect_type' }
    ],
    showDetail: false,
    selectedRecord: null
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
      
      // 格式化时间显示
      const formattedRecords = records.map(record => ({
        ...record,
        formatTime: this.formatTime(record.createTime)
      }))

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

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 执行搜索
  searchRecords() {
    this.applyFilters()
  },

  // 设置筛选类型
  setFilter(e) {
    const filterType = e.currentTarget.dataset.type
    this.setData({
      filterType
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
    
    // 应用搜索筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase()
      filtered = filtered.filter(record => 
        record.defectType.toLowerCase().includes(keyword)
      )
    }
    
    // 应用类型筛选
    if (this.data.filterType !== 'all') {
      filtered = filtered.filter(record => 
        record.defectType === this.data.filterType
      )
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
      case 'defect_type':
        filtered.sort((a, b) => a.defectType.localeCompare(b.defectType))
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