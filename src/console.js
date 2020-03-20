import React, { Component } from 'react'
import { FlatList, Text, StyleSheet, View, ScrollView } from 'react-native'
import JsonTree from '@sishuguojixuefu/react-native-json-tree'
import dayjs from 'dayjs'
import event from './event'
import { debounce } from './tool'

let logStack = null

// log 消息类
class LogStack {
  constructor() {
    this.logs = []
    this.maxLength = 100
    this.listeners = []
    this.notify = debounce(500, false, this.notify)
  }

  getLogs() {
    return this.logs
  }

  addLog(method, data) {
    if (this.logs.length > this.maxLength) {
      this.logs = this.logs.slice(1)
    }
    const date = new Date()
    this.logs.push({
      method,
      data,
      time: dayjs().format('YYYY年M月D日 HH:mm:ss SSS'),
      id: unixId(),
    })
    this.notify()
  }

  clearLogs() {
    this.logs = []
    this.notify()
  }

  notify() {
    this.listeners.forEach(callback => {
      callback()
    })
  }

  attach(callback) {
    this.listeners.push(callback)
  }
}

class Console extends Component {
  constructor(props) {
    super(props)
    this.name = 'Log'
    this.mountState = false
    this.state = {
      logs: [],
    }
    logStack.attach(() => {
      if (this.mountState) {
        this.setState({
          logs: logStack.getLogs(),
        })
      }
    })
  }

  componentDidMount() {
    this.mountState = true
    this.setState({
      logs: logStack.getLogs(),
    })
    event.on('clear', this.clearLogs.bind(this))
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextState.logs.length !== this.state.logs.length
  }

  componentWillUnmount() {
    this.mountState = false
    event.off('clear', this.clearLogs.bind(this))
  }

  scrollToEnd = () => {
    this.flatList.scrollToEnd({ animated: true })
  }

  clearLogs(name) {
    if (name === this.name) {
      logStack.clearLogs()
    }
  }

  renderLogItem({ item }) {
    return (
      <View style={styles.logItem}>
        <Text style={styles.logItemTime}>{item.time}</Text>
        <ScrollView
          automaticallyAdjustContentInsets={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          horizontal={true}
        >
          <JsonTree data={item.data} hideRoot />
        </ScrollView>
      </View>
    )
  }

  render() {
    return (
      <FlatList
        ref={ref => {
          this.flatList = ref
        }}
        // onContentSizeChange={() => this.flatList.scrollToEnd({ animated: true })}
        // onLayout={() => this.flatList.scrollToEnd({ animated: true })}
        initialNumToRender={20}
        showsVerticalScrollIndicator
        extraData={this.state}
        data={this.state.logs}
        renderItem={this.renderLogItem}
        ListEmptyComponent={() => <Text> Loading...</Text>}
        keyExtractor={item => item.id}
      />
    )
  }
}

const styles = StyleSheet.create({
  logItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#d3d3d3',
  },
  logItemTime: {
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
})

function unixId() {
  return Math.round(Math.random() * 1000000).toString(16)
}

function proxyConsole(console, stack) {
  const methods = ['log', 'error', 'info']
  methods.forEach(method => {
    const fn = console[method]
    console[method] = (...args) => {
      stack.addLog(method, args)
      fn.apply(console, args)
    }
  })
}

module.exports = (() => {
  if (!logStack) {
    logStack = new LogStack()
  }
  proxyConsole(global.console, logStack)
  return <Console />
})()
