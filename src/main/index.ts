import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { registerIpc } from './ipc'
import { initDatabase } from './data/db'
import { SqliteProjectRepository } from './data/sqlite-repository'
import { SqliteManuscriptRepository } from './data/manuscript-repository'
import { SqliteStyleRepository } from './data/style-repository'
import { SqliteStructureRepository } from './data/structure-repository'
import { SqliteCharacterRepository } from './data/character-repository'
import { SqliteTimelineRepository } from './data/timeline-repository'
import { SqliteWorldRepository } from './data/world-repository'
import { SettingsRepository } from './data/settings-repository'
import { SearchService } from './data/search-service'
import { PlotService } from './data/plot-service'
import { SnapshotService } from './data/snapshot-service'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b1020',
    title: 'AuthorOS',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())

  // I link esterni si aprono nel browser di sistema, non in una finestra Electron.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  const dataDir = join(app.getPath('userData'), 'authoros-data')
  const db = await initDatabase(dataDir)
  const settings = new SettingsRepository(dataDir)
  const snapshots = new SnapshotService(db, dataDir)
  registerIpc(ipcMain, {
    projects: new SqliteProjectRepository(db),
    manuscript: new SqliteManuscriptRepository(db),
    styles: new SqliteStyleRepository(db),
    structure: new SqliteStructureRepository(db),
    characters: new SqliteCharacterRepository(db),
    timeline: new SqliteTimelineRepository(db),
    world: new SqliteWorldRepository(db),
    settings,
    searchService: new SearchService(db),
    snapshots,
    plot: new PlotService(db)
  })

  // Auto-snapshot del progetto attivo ogni 15 minuti, solo se cambiato (US-24.3).
  setInterval(() => {
    const pid = settings.get().lastProjectId
    if (pid) snapshots.autoSnapshot(pid)
  }, 15 * 60 * 1000)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
