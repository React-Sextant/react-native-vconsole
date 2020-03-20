import React, { Component } from 'react'
import { FlatList, Text, StyleSheet, View } from 'react-native'
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
    if (method === 'warn') {
      return
    }
    this.logs.push({
      method,
      data: strLog(data),
      time: `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`,
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
        <Text style={[styles.logItemText, styles[item.method]]}>{item.data}</Text>
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
  log: {
    color: '#000',
  },
  warn: {
    color: 'orange',
    backgroundColor: '#fffacd',
    borderColor: '#ffb930',
  },
  error: {
    color: '#dc143c',
    backgroundColor: '#ffe4e1',
    borderColor: '#f4a0ab',
  },
  logItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  logItemText: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  logItemTime: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
})

function unixId() {
  return Math.round(Math.random() * 1000000).toString(16)
}

function strLog(logs) {
  const arr = logs.map(data => formatLog(data))
  return arr.join(' ')
}

function formatLog(obj) {
  if (
    obj === null ||
    obj === undefined ||
    typeof obj === 'string' ||
    typeof obj === 'number' ||
    typeof obj === 'boolean' ||
    typeof obj === 'function'
  ) {
    return `"${String(obj)}"`
  }
  if (obj instanceof Date) {
    return `Date(${obj.toISOString()})`
  }
  if (Array.isArray(obj)) {
    return `Array(${obj.length})[${obj.map(elem => formatLog(elem))}]`
  }
  if (obj.toString) {
    return `object(${JSON.stringify(obj, null, 2)})`
  }
  return 'unknown data'
}

function proxyConsole(console, stack) {
  const methods = ['log', 'warn', 'error', 'info']
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
