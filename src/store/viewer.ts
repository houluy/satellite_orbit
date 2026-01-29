import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as Cesium from "cesium"
import type { CellObject, GroundObject, Satellite } from '@/model/satellite'
import * as satellite from "satellite.js"

export const useEntitiesStore = defineStore('entities', () => {
  const groundStations = ref<GroundObject[]>([])
  const ues = ref<GroundObject[]>([])
  const satellites = ref<Satellite[]>([])
  const cells = ref<CellObject[]>([])

  return { groundStations, ues, satellites, cells }
})

export const useViewerStore = defineStore('viewer', () => {
  const viewerReady = ref(false)
  const viewer = ref<Cesium.Viewer | null>(null)
  // Primitive 相关 
  const satellitePrimitive = ref<Cesium.PointPrimitiveCollection | null>(null)
  const orbitPrimitive = ref<Cesium.Primitive | null>(null) 
  const velocityPrimitive = ref<Cesium.Primitive | null>(null)
  // 地面站-卫星连线Primitiv <该功能暂时隐藏>
  const linkLinePrimitive = ref<Cesium.Primitive | null>(null)

  const satelliteRunning = ref(false)
  const positionUpdateTimer = ref<number | null>(null)
  const satelliteOrbitTimestamps = new Map<string, Cesium.JulianDate[]>();
  // 存储卫星的初始位置（现在运行停止后卫星点会固定在停止时刻的位置）
  const satelliteInitialPositions = ref<Map<string, Cesium.Cartesian3>>(new Map())
  let isFirstSatelliteUpdate = true;

  type LinkBudgetResult = {
    satelliteName: string;
    distance: string;
    elevationAngle: string; //仰角字段
    freeSpacePathLoss: string;
    atmosphericLoss: string; // 大气损耗字段
    totalPathLoss: string; // 总路径损耗字段
    eirp: string;
    receivedPower: string;
    noisePower: string;
    snr: string;
    gt: string; // G/T字段
    isVisible: boolean; // 可见性字段
    quality: string; 
    rainLoss: string;           // 降雨衰减
    polarizationLoss: string;   // 极化损耗
    pointingLoss: string;       // 指向误差
    feederLoss: string;         // 馈线损耗
  } | null; // 允许结果为对象或null
  
  type LinkBudgetType = {
    targetRegion?: { 
      name: string;
      center: Cesium.Cartesian3;
      radius: number;
    };
    results: LinkBudgetResult;
    isVisible?: boolean;
  };

  const linkBudget = ref<LinkBudgetType>({
    results: null,
    isVisible: true // 初始化可见性
  });

  function setViewer(v: Cesium.Viewer) {
    viewer.value = v
    viewerReady.value = true
  }

  //！！！销毁
  function destroyViewer() {
    if (viewer.value) {
      // 新增：销毁连线Primitive
      clearLinkLine();

      //停止位置更新定时器
      if (positionUpdateTimer.value) {
        clearInterval(positionUpdateTimer.value)
        positionUpdateTimer.value = null
      }
      // 清理 Primitive
      if (satellitePrimitive.value) {
        viewer.value.scene.primitives.remove(satellitePrimitive.value)
        satellitePrimitive.value.destroy()
        satellitePrimitive.value = null
      }
      // 补充轨道和速度箭头的销毁，防止内存泄漏
      if (orbitPrimitive.value && !orbitPrimitive.value.isDestroyed()) {
        viewer.value.scene.primitives.remove(orbitPrimitive.value)
        orbitPrimitive.value.destroy()
        orbitPrimitive.value = null
      }
      if (velocityPrimitive.value) {
        viewer.value.scene.primitives.remove(velocityPrimitive.value)
        velocityPrimitive.value.destroy()
        velocityPrimitive.value = null
      }
      
      viewer.value.destroy()
      viewer.value = null
      viewerReady.value = false
    }  
  }

  // ！！！卫星点渲染函数
  function renderSatellites(satellites: Satellite[], pointColor?: string, pointSize?: number) {
    if (!viewer.value || viewer.value.isDestroyed()) return null
    
    // 销毁旧实例
    if (satellitePrimitive.value) {
      try {
        if (!satellitePrimitive.value.isDestroyed()) {
          viewer.value.scene.primitives.remove(satellitePrimitive.value);
          satellitePrimitive.value.destroy();
        }
      } catch (e) {
        console.warn('清理卫星点实例异常:', e);
      }
      satellitePrimitive.value = null;
    }

    // 修复：强制默认值，确保是字符串
    const colorStr = pointColor ?? "#74D3AE"; 
    const color = Cesium.Color.fromCssColorString(colorStr);
    const size = pointSize || 6;
    const pointCollection = new Cesium.PointPrimitiveCollection()

    satellites.forEach((sat) => {
      try {
        const position = sat.position || Cesium.Cartesian3.fromDegrees(0, 0, 35786000)
        const point = pointCollection.add({
          position: position,
          color: color,
          pixelSize: size,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1
        })
        // 关联卫星原始数据到 PointPrimitive，方便后续更新位置
        ;(point as any).satelliteData = sat
        ;(point as any).satelliteId = sat.id //已挂载
        ;(point as any).name = sat.name;
      } catch (error) {
        console.warn('添加卫星点失败:', sat.id, error)
      }
    })
    satellitePrimitive.value = pointCollection
    viewer.value.scene.primitives.add(pointCollection)
    
    // 如果运行状态已开启，立即启动位置更新
    if (satelliteRunning.value) {
      startSatellitePositionUpdate(satellites)
    }
    return pointCollection
  }

  // ！！！启动卫星位置实时更新 running
  function startSatellitePositionUpdate(satellites: Satellite[]) {
    if (positionUpdateTimer.value || !viewer.value || !satellitePrimitive.value) return
    
    positionUpdateTimer.value = window.setInterval(() => {
      if (!viewer.value || !satellitePrimitive.value) {
        stopSatellitePositionUpdate()
        return
      }
      
      const viewerClock = viewer.value.clock
      
      // 遍历所有点（使用 length 和 get 方法）
      for (let i = 0; i < satellitePrimitive.value.length; i++) {
        const point = satellitePrimitive.value.get(i) as any
        if (!point || !point.satelliteData) continue
        
        const sat = point.satelliteData as Satellite
        if (!sat.satrec || !sat.orbit?.epoch) continue

        // 从轨道历元时刻开始运行 
        const orbitEpoch = Cesium.JulianDate.fromDate(sat.orbit.epoch);
        const clockOffset = Cesium.JulianDate.secondsDifference(
          viewerClock.currentTime,
          viewerClock.startTime
        );
        const currentTime = Cesium.JulianDate.addSeconds(
          orbitEpoch,
          clockOffset,
          new Cesium.JulianDate()
        );

        // 计算当前时间相对于 TLE 历元的分钟数
        const secondsSinceEpoch = Cesium.JulianDate.secondsDifference(
          currentTime, 
          orbitEpoch
        )
        const minutesSinceEpoch = secondsSinceEpoch / 60
    
        // 原有逻辑完全保留
        const pv = satellite.sgp4(sat.satrec, minutesSinceEpoch)
        if (!pv?.position) continue

        const newPosition = eciToCartesian3([pv.position])[0]
        if (newPosition) {
          point.position = newPosition
          sat.position = newPosition
        }
      }

      updateAllSatellitesVisibility();

    }, 50) // 20 FPS 更新频率
  }
  
  // ！！！停止卫星位置更新
  function stopSatellitePositionUpdate() {
    if (positionUpdateTimer.value) {
      clearInterval(positionUpdateTimer.value)
      positionUpdateTimer.value = null
    }
  }

  // !!!控制卫星运行/停止的开关
  function setSatelliteRunning(running: boolean, satellites: Satellite[]) {
    satelliteRunning.value = running
    
    if (running) {
      startSatellitePositionUpdate(satellites)
    } else {
      stopSatellitePositionUpdate()
      
      // 停止后重置卫星位置到初始状态
      if (satellitePrimitive.value) {
        for (let i = 0; i < satellitePrimitive.value.length; i++) {
          const point = satellitePrimitive.value.get(i) as any
          if (point && point.satelliteData) {
            const sat = point.satelliteData as Satellite
            const initialPosition = satelliteInitialPositions.value.get(sat.id)
            if (initialPosition) {
              point.position = initialPosition
              sat.position = initialPosition.clone()
            }
          }
        }
      }
    }
  }

  // ！！！轨道线 Primitive 渲染
  function renderSatelliteOrbits(
    satellites: Satellite[],
    orbitColor?: string,
    orbitSize: number = 2,
    show = true
  ) {
    if (!viewer.value || viewer.value.isDestroyed() || !Array.isArray(satellites) || satellites.length === 0) {
      if (orbitPrimitive.value) orbitPrimitive.value = null;
      return null;
    }

    // 安全处理颜色
    const orbitColorStr = (orbitColor ?? "#00ff00") as string;
    const color = Cesium.Color.fromCssColorString(orbitColorStr);
    const width = orbitSize;

    // 销毁旧Primitive
    if (orbitPrimitive.value) {
      try {
        if (!orbitPrimitive.value.isDestroyed()) {
          viewer.value.scene.primitives.remove(orbitPrimitive.value);
          orbitPrimitive.value.destroy();
        }
      } catch (e) {
        console.warn('清理旧轨道实例异常:', e);
      }
      orbitPrimitive.value = null;
    }

    const geometryInstances: Cesium.GeometryInstance[] = [];
    satellites.forEach(sat => {
      if (!sat.orbit?.positions || sat.orbit.positions.length < 2) return;

      try {
        // 只传纯坐标数组，不挂载任何自定义数据
        const polylineGeo = new Cesium.PolylineGeometry({
          positions: sat.orbit.positions,
          width: width,
          vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT
        });
        
        const instance = new Cesium.GeometryInstance({
          geometry: polylineGeo,
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
          },
          // 只传简单字符串ID，不传复杂对象
          id: `orbit_${sat.id}`, 
        });
        geometryInstances.push(instance);
      } catch (e) {
        console.warn(`轨道创建失败（卫星${sat.id}）:`, e);
      }
    });

    if (geometryInstances.length === 0) return null;
    
    const orbitAppearance = new Cesium.PolylineColorAppearance({
      translucent: false,
    });
    
    const newOrbitPrimitive = new Cesium.Primitive({
      geometryInstances: geometryInstances,
      appearance: orbitAppearance,
      // 关闭异步渲染
      asynchronous: false, 
      show: show,
      // 释放几何实例
      releaseGeometryInstances: true 
    });
    
    // 只挂载简单标记，不挂载复杂对象
    (newOrbitPrimitive as any).isOrbitCollection = true;
    viewer.value.scene.primitives.add(newOrbitPrimitive);
    orbitPrimitive.value = newOrbitPrimitive;
    return newOrbitPrimitive;
  }

  /*
  function renderSatelliteVelocities(satellites: Satellite[], velocityColor?: string, velocityLength?: number, velocitySize?: number, show = false) {
  if (!viewer.value || viewer.value.isDestroyed()) return null
  
  // 清除旧速度箭头
  if (velocityPrimitive.value) {
    try {
      if (!velocityPrimitive.value.isDestroyed()) {
        viewer.value.scene.primitives.remove(velocityPrimitive.value)
        velocityPrimitive.value.destroy()
      }
    } catch (e) {
      console.warn('清理速度箭头实例异常:', e);
    }
    velocityPrimitive.value = null;
  }
  
  const colorStr = velocityColor ?? "#f7ece1";
  const color = Cesium.Color.fromCssColorString(colorStr).withAlpha(0.8);
  const length = (velocityLength || 200) * 0.8; 
  const width = (velocitySize || 2) * 1.5; 
  
  const geometryInstances: Cesium.GeometryInstance[] = []
  
  satellites.forEach((sat) => {
    try {
      if(!sat.orbit?.epoch || !sat.satrec || !sat.position) return;
      const now = new Date()
      const minutesSinceEpoch = (now.getTime() - sat.orbit.epoch.getTime()) / (1000 * 60)
      const pv = satellite.sgp4(sat.satrec, minutesSinceEpoch)
      
      if (pv?.position && pv?.velocity) {
        // 计算速度方向向量
        const velocity = Cesium.Cartesian3.multiplyByScalar(
          new Cesium.Cartesian3(pv.velocity.x, pv.velocity.y, pv.velocity.z),
          length * 1000,
          new Cesium.Cartesian3()
        )
        
        // 箭头终点
        const endPosition = Cesium.Cartesian3.add(sat.position, velocity, new Cesium.Cartesian3())
        
        // ============ 构造箭头形状 ============
        
        // 1. 箭头主干（直线部分）
        const mainLine = new Cesium.PolylineGeometry({
          positions: [sat.position, endPosition],
          width: width,
          vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT
        })
        
        // 2. 计算箭头头部（两个斜线）
        const velocityDir = Cesium.Cartesian3.normalize(velocity, new Cesium.Cartesian3())
        
        // 计算垂直方向（用于构造箭头头部）
        let perpendicular = new Cesium.Cartesian3(0, 0, 1)
        if (Math.abs(Cesium.Cartesian3.dot(velocityDir, perpendicular)) > 0.99) {
          // 如果速度方向接近垂直，换一个垂直向量
          perpendicular = new Cesium.Cartesian3(1, 0, 0)
        }
        
        // 计算箭头头部的两个方向
        const cross = Cesium.Cartesian3.cross(velocityDir, perpendicular, new Cesium.Cartesian3())
        Cesium.Cartesian3.normalize(cross, cross)
        
        // 箭头头部长度（主干长度的20%）
        const headLength = Cesium.Cartesian3.magnitude(velocity) * 0.2
        
        // 箭头头部宽度（主干宽度的3倍）
        const headWidth = width * 3
        
        // 计算两个箭头头部点
        const headDir1 = Cesium.Cartesian3.add(
          Cesium.Cartesian3.multiplyByScalar(velocityDir, -0.8, new Cesium.Cartesian3()),
          Cesium.Cartesian3.multiplyByScalar(cross, 0.3, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        )
        Cesium.Cartesian3.normalize(headDir1, headDir1)
        const headPoint1 = Cesium.Cartesian3.add(
          endPosition,
          Cesium.Cartesian3.multiplyByScalar(headDir1, headLength, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        )
        
        const headDir2 = Cesium.Cartesian3.add(
          Cesium.Cartesian3.multiplyByScalar(velocityDir, -0.8, new Cesium.Cartesian3()),
          Cesium.Cartesian3.multiplyByScalar(cross, -0.3, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        )
        Cesium.Cartesian3.normalize(headDir2, headDir2)
        const headPoint2 = Cesium.Cartesian3.add(
          endPosition,
          Cesium.Cartesian3.multiplyByScalar(headDir2, headLength, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        )
        
        // 3. 箭头头部左斜线
        const leftHeadLine = new Cesium.PolylineGeometry({
          positions: [endPosition, headPoint1],
          width: width,
          vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT
        })
        
        // 4. 箭头头部右斜线
        const rightHeadLine = new Cesium.PolylineGeometry({
          positions: [endPosition, headPoint2],
          width: width,
          vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT
        })
        
        // 添加所有线段
        geometryInstances.push(
          new Cesium.GeometryInstance({
            geometry: mainLine,
            attributes: {
              color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
            },
            id: `${sat.id}_velocity_main`
          }),
          new Cesium.GeometryInstance({
            geometry: leftHeadLine,
            attributes: {
              color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
            },
            id: `${sat.id}_velocity_head_left`
          }),
          new Cesium.GeometryInstance({
            geometry: rightHeadLine,
            attributes: {
              color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
            },
            id: `${sat.id}_velocity_head_right`
          })
        )
      }
    } catch (error) {
      console.warn('创建速度箭头失败:', sat.id, error)
    }
  })
  
  if (geometryInstances.length === 0) return null
  
  try {
    const velocityPrimitiveInstance = new Cesium.Primitive({
      geometryInstances: geometryInstances,
      appearance: new Cesium.PolylineColorAppearance({ 
        translucent: true
      }),
      asynchronous: false,
      releaseGeometryInstances: false,
      show: show 
    })
    
    viewer.value.scene.primitives.add(velocityPrimitiveInstance)
    velocityPrimitive.value = velocityPrimitiveInstance;
    return velocityPrimitiveInstance;
  } catch (error) {
    console.error('创建速度箭头 Primitive 失败:', error)
    return null
  }
}
*/
  //！！！速度箭头
  function renderSatelliteVelocities(satellites: Satellite[], velocityColor?: string, velocityLength?: number, velocitySize?: number, show = false) {
    if (!viewer.value || viewer.value.isDestroyed()) return null
    
    // 清除旧速度箭头（修复清理逻辑）
    if (velocityPrimitive.value) {
      try {
        // 先检查是否已被销毁，避免重复销毁
        if (velocityPrimitive.value && !velocityPrimitive.value.isDestroyed && !velocityPrimitive.value.isDestroyed()) {
          viewer.value.scene.primitives.remove(velocityPrimitive.value)
          velocityPrimitive.value.destroy()
        }
      } catch (e) {
        // 如果已经销毁，忽略错误
        if (!e.message?.includes('destroyed')) {
          console.warn('清理速度箭头实例异常:', e);
        }
      }
      velocityPrimitive.value = null;
    }
    
    // 如果不需要显示，直接返回（已经清除了）
    if (!show) {
      return null;
    }
    
    const colorStr = velocityColor ?? "#f7ece1";
    const color = Cesium.Color.fromCssColorString(colorStr).withAlpha(0.8);
    const length = (velocityLength || 200) * 0.8; 
    const width = (velocitySize || 2) * 1.5; 
    
    const geometryInstances: Cesium.GeometryInstance[] = []
    
    satellites.forEach((sat) => {
      try {
        if(!sat.orbit?.epoch || !sat.satrec || !sat.position) return;
        const now = new Date()
        const minutesSinceEpoch = (now.getTime() - sat.orbit.epoch.getTime()) / (1000 * 60)
        const pv = satellite.sgp4(sat.satrec, minutesSinceEpoch)
        
        if (pv?.position && pv?.velocity) {
          // 计算速度方向向量
          const velocity = Cesium.Cartesian3.multiplyByScalar(
            new Cesium.Cartesian3(pv.velocity.x, pv.velocity.y, pv.velocity.z),
            length * 1000,
            new Cesium.Cartesian3()
          )
          
          // 箭头终点
          const endPosition = Cesium.Cartesian3.add(sat.position, velocity, new Cesium.Cartesian3())
          
          // 1. 箭头主干（直线部分）
          const mainLine = new Cesium.PolylineGeometry({
            positions: [sat.position, endPosition],
            width: width,
            vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT
          })
          
          // 2. 计算箭头头部方向
          const velocityDir = Cesium.Cartesian3.normalize(velocity, new Cesium.Cartesian3())
          
          // 创建一个垂直向量
          let perpendicular = new Cesium.Cartesian3(0, 0, 1)
          if (Math.abs(Cesium.Cartesian3.dot(velocityDir, perpendicular)) > 0.99) {
            perpendicular = new Cesium.Cartesian3(1, 0, 0)
          }
          
          // 计算叉积得到另一个垂直方向
          const cross = Cesium.Cartesian3.cross(velocityDir, perpendicular, new Cesium.Cartesian3())
          Cesium.Cartesian3.normalize(cross, cross)
          
          // 箭头头部长度（主干长度的15%）
          const headLength = Cesium.Cartesian3.magnitude(velocity) * 0.15
          
          // 计算90°夹头的两个方向
          // 夹头夹角90°，所以每个分支与反方向的夹角为45°
          // 使用三角函数计算45°角的分量
          const angle45 = Math.PI / 4; // 45度弧度
          
          // 计算箭头头部的两个点
          // headDir1: 与速度反方向成45度角
          const headDir1 = new Cesium.Cartesian3();
          // 计算45度角的分量
          const cos45 = Math.cos(angle45);
          const sin45 = Math.sin(angle45);
          
          // 第一个头部方向：反方向 + 垂直方向
          headDir1.x = -cos45 * velocityDir.x + sin45 * cross.x;
          headDir1.y = -cos45 * velocityDir.y + sin45 * cross.y;
          headDir1.z = -cos45 * velocityDir.z + sin45 * cross.z;
          Cesium.Cartesian3.normalize(headDir1, headDir1);
          
          const headPoint1 = Cesium.Cartesian3.add(
            endPosition,
            Cesium.Cartesian3.multiplyByScalar(headDir1, headLength, new Cesium.Cartesian3()),
            new Cesium.Cartesian3()
          )
          
          // 第二个头部方向：反方向 - 垂直方向
          const headDir2 = new Cesium.Cartesian3();
          headDir2.x = -cos45 * velocityDir.x - sin45 * cross.x;
          headDir2.y = -cos45 * velocityDir.y - sin45 * cross.y;
          headDir2.z = -cos45 * velocityDir.z - sin45 * cross.z;
          Cesium.Cartesian3.normalize(headDir2, headDir2);
          
          const headPoint2 = Cesium.Cartesian3.add(
            endPosition,
            Cesium.Cartesian3.multiplyByScalar(headDir2, headLength, new Cesium.Cartesian3()),
            new Cesium.Cartesian3()
          )
          
          // 3. 创建45°箭杆（从主干的75%位置开始到头部）
          const shaftStart = Cesium.Cartesian3.add(
            sat.position,
            Cesium.Cartesian3.multiplyByScalar(velocity, 0.75, new Cesium.Cartesian3()),
            new Cesium.Cartesian3()
          )
          
          // 4. 箭头头部左斜线
          const leftHeadLine = new Cesium.PolylineGeometry({
            positions: [shaftStart, headPoint1],
            width: width,
            vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT
          })
          
          // 5. 箭头头部右斜线
          const rightHeadLine = new Cesium.PolylineGeometry({
            positions: [shaftStart, headPoint2],
            width: width,
            vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT
          })
          
          // 6. 可选：添加连接两个头部点的线，形成完整的箭头头部
          const headConnectorLine = new Cesium.PolylineGeometry({
            positions: [headPoint1, headPoint2],
            width: width * 0.7,
            vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT
          })
          
          // 添加所有线段
          geometryInstances.push(
            new Cesium.GeometryInstance({
              geometry: mainLine,
              attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
              },
              id: `${sat.id}_velocity_main`
            }),
            new Cesium.GeometryInstance({
              geometry: leftHeadLine,
              attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
              },
              id: `${sat.id}_velocity_head_left`
            }),
            new Cesium.GeometryInstance({
              geometry: rightHeadLine,
              attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
              },
              id: `${sat.id}_velocity_head_right`
            }),
            new Cesium.GeometryInstance({
              geometry: headConnectorLine,
              attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
              },
              id: `${sat.id}_velocity_head_connector`
            })
          )
        }
      } catch (error) {
        console.warn('创建速度箭头失败:', sat.id, error)
      }
    })
    
    if (geometryInstances.length === 0) return null
    
    try {
      const velocityPrimitiveInstance = new Cesium.Primitive({
        geometryInstances: geometryInstances,
        appearance: new Cesium.PolylineColorAppearance({ 
          translucent: true
        }),
        asynchronous: false,
        releaseGeometryInstances: false,
        show: true
      })
      
      // 添加标记属性，便于后续管理
      ;(velocityPrimitiveInstance as any).isVelocityCollection = true
      viewer.value.scene.primitives.add(velocityPrimitiveInstance)
      velocityPrimitive.value = velocityPrimitiveInstance;
      return velocityPrimitiveInstance;
    } catch (error) {
      console.error('创建速度箭头 Primitive 失败:', error)
      return null
    }
  }  

  // ! ! ! 从配置文件读取地面站坐标
  async function getGroundStationFromCfg() {
    try {
      // 读取配置文件
      const response = await fetch('/config/dump.ENB-gnb-imt2030-ntn.cfg');
      if (!response.ok) {
        throw new Error(`读取配置文件失败：HTTP状态码 ${response.status}`);
      }
      const cfgContent = await response.text();

      // 解析经纬度
      const latMatch = cfgContent.match(/latitude\s*=\s*([-+]?\d+\.?\d*)/i);
      const lngMatch = cfgContent.match(/longitude\s*=\s*([-+]?\d+\.?\d*)/i);
      const altMatch = cfgContent.match(/altitude\s*=\s*([-+]?\d+\.?\d*)/i);

      //判断match结果是否存在，再取值；取不到则用默认值
      const latStr = latMatch?.[1] ?? "40.0"; // 北京纬度默认值
      const lngStr = lngMatch?.[1] ?? "116.4"; // 北京经度默认值
      const altStr = altMatch?.[1] ?? "0";     // 海拔默认0米

      // 转数字
      let latitude = parseFloat(latStr);
      let longitude = parseFloat(lngStr);
      let altitude = parseFloat(altStr);

      latitude = isNaN(latitude) ? 40.0 : latitude;
      longitude = isNaN(longitude) ? 116.4 : longitude;
      altitude = isNaN(altitude) ? 0 : altitude;

      return {
        lng: longitude,
        lat: latitude,
        height: altitude
      };
    } catch (error) {
      console.error('解析地面站配置文件失败:', error);
    
      return {
        lng: 116.4,
        lat: 40.0,
        height: 50
      };
    }
  }

  // ！！！链路预算计算
  async function calculateLinkBudget(sat: Satellite, satPosition: Cesium.Cartesian3) {
    if (!sat || !satPosition || !viewer.value) return;
    
    try {
      // 1. 基础计算
      const groundStation = await getGroundStationFromCfg();
      const groundPos = Cesium.Cartesian3.fromDegrees(
        groundStation.lng, groundStation.lat, groundStation.height
      );
      
      // 仰角计算
      const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(groundPos);
      const satToGround = Cesium.Cartesian3.subtract(satPosition, groundPos, new Cesium.Cartesian3());
      const dot = Cesium.Cartesian3.dot(up, Cesium.Cartesian3.normalize(satToGround, new Cesium.Cartesian3()));
      let elevationAngle = Cesium.Math.toDegrees(Math.asin(Math.max(-1, Math.min(1, dot)))) || 0;
      
      // 可见性判断
      const isVisible = elevationAngle > 5;
      
      //  2. 系统参数 
      const distance = Cesium.Cartesian3.distance(satPosition, groundPos) / 1000; // km
      const frequencyGHz = 12; // Ku波段 12GHz
      
      // 发射端参数
      const txPowerW = 30; // W
      const txPowerdBW = 10 * Math.log10(txPowerW); // 14.77 dBW
      const txGain = 30; // dBi
      
      // 接收端参数
      const rxGain = 40; // dBi
      const bandwidthHz = 5e6; // 5 MHz
      const systemNoiseTempK = 290; // K
      
      //  3. 各种损耗计算 
      
      // 3.1 自由空间路径损耗
      const fspl = 32.45 + 20 * Math.log10(distance) + 20 * Math.log10(frequencyGHz * 1000);
        
      // 3.2 大气损耗（基于ITU-R P.676的简化模型）
      const atmosphericLoss = calculateAtmosphericLossSimple(elevationAngle, frequencyGHz);
      
      // 3.3 降雨衰减（基于ITU-R P.838的简化模型）
      const rainLoss = calculateRainLossSimple(elevationAngle, frequencyGHz);
      
      // 3.4 其他损耗
      const polarizationLoss = 0.5; // dB，极化失配
      const pointingLoss = 0.7; // dB，指向误差（发射+接收）
      const feederLoss = 1.0; // dB，馈线损耗（发射+接收）
      const otherLosses = polarizationLoss + pointingLoss + feederLoss;
      
      // 3.5 总路径损耗
      const totalPathLoss = fspl + atmosphericLoss + rainLoss + otherLosses;
      
      // 4. 功率计算 
      const eirp = txPowerdBW + txGain; // dBW
      const receivedPower = eirp - totalPathLoss + rxGain; // dBW
      
      // 5. 噪声计算 
      const noisePower = 10 * Math.log10(1.380649e-23 * systemNoiseTempK * bandwidthHz); // dBW
      const snr = receivedPower - noisePower; // dB
      
      // 6. 品质因数计算
      const gt = rxGain - 10 * Math.log10(systemNoiseTempK); // dB/K
      
      // 7. 链路质量评估
      const quality = evaluateLinkQuality(snr, isVisible);
      
      //  8. 存储结果 
      linkBudget.value.results = {
        satelliteName: sat.name || '未知卫星',
        distance: distance.toFixed(1),
        elevationAngle: elevationAngle.toFixed(1),
        freeSpacePathLoss: fspl.toFixed(1),
        atmosphericLoss: atmosphericLoss.toFixed(1),
        rainLoss: rainLoss.toFixed(1),
        polarizationLoss: polarizationLoss.toFixed(1),
        pointingLoss: pointingLoss.toFixed(1),
        feederLoss: feederLoss.toFixed(1),
        totalPathLoss: totalPathLoss.toFixed(1),
        eirp: eirp.toFixed(1),
        receivedPower: receivedPower.toFixed(1),
        noisePower: noisePower.toFixed(1),
        snr: snr.toFixed(1),
        gt: gt.toFixed(1),
        isVisible,
        quality
      };
      linkBudget.value.isVisible = true;
      
    } catch (error) {
      console.error('链路预算计算失败:', error);
      linkBudget.value.results = null;
      linkBudget.value.isVisible = false;
    }
  }
  // 大气损耗计算（基于ITU-R P.676简化模型）
  function calculateAtmosphericLossSimple(elevationAngle: number, frequencyGHz: number): number {
    if (elevationAngle <= 0) return 999; // 不可见
    
    // 将角度转换为弧度
    const elRad = elevationAngle * Math.PI / 180;
    
    // 有效大气路径长度（km）
    const effectivePathLength = 10 / Math.sin(elRad);
    
    // 特定衰减系数（dB/km），基于ITU-R P.676表格的近似值
    let specificAttenuation = 0;
    
    if (frequencyGHz < 6) {
      // C波段
      specificAttenuation = 0.03 + (frequencyGHz / 100);
    } else if (frequencyGHz < 14) {
      // Ku波段
      specificAttenuation = 0.07 + (frequencyGHz / 200);
    } else {
      // Ka波段
      specificAttenuation = 0.15 + (frequencyGHz / 150);
    }
    
    // 总大气损耗
    let loss = specificAttenuation * effectivePathLength;
    
    // 对于极低仰角增加额外损耗
    if (elevationAngle < 5) {
      loss *= 1.5; // 低仰角时额外增加50%
    }
    
    if (elevationAngle < 2) {
      loss *= 2.0; // 极低仰角时额外增加100%
    }
    
    // 限制范围（0.1dB到30dB）
    return Math.max(0.1, Math.min(loss, 30));
  }

  // 降雨衰减计算（基于ITU-R P.838简化模型）
  function calculateRainLossSimple(elevationAngle: number, frequencyGHz: number): number {
    if (elevationAngle <= 0) return 0;
    
    // 假设中等降雨强度（10mm/hr），可后续扩展为参数
    const rainRate = 10; // mm/hr
    
    // 降雨衰减系数（dB/km），基于ITU-R P.838
    let k = 0, alpha = 0;
    
    if (frequencyGHz <= 12) {
      // 对于Ku波段及以下
      k = 0.0168 * Math.pow(frequencyGHz, 1.61);
      alpha = 1.12 * Math.pow(frequencyGHz, -0.17);
    } else {
      // 对于Ka波段及以上
      k = 0.071 * Math.pow(frequencyGHz, 0.83);
      alpha = 0.91 * Math.pow(frequencyGHz, -0.09);
    }
    
    // 有效降雨路径长度（km）
    const pathLength = 3.5 / Math.sin(elevationAngle * Math.PI / 180);
    
    // 降雨衰减
    const rainLoss = k * Math.pow(rainRate, alpha) * pathLength;
    
    return Math.min(rainLoss, 30); // 限制最大值
  }

  // !!!链路质量评估
  function evaluateLinkQuality(snr: number, isVisible: boolean): string {
    if (!isVisible) return 'None';
    
    if (snr > 20) return 'Excellent';     // 极好
    if (snr > 14) return 'Good';          // 良好
    if (snr > 10) return 'Fair';          // 一般
    if (snr > 6) return 'Poor';           // 差
    return 'Very Poor';                   // 极差
  }

  // ！！！实时更新所有卫星的可见性高亮
  async function updateAllSatellitesVisibility() {
    if (!viewer.value || !satellitePrimitive.value || !satelliteRunning.value) return;

    try {
      //  获取地面站坐标
      const groundStation = await getGroundStationFromCfg();
      const groundPos = Cesium.Cartesian3.fromDegrees(
        groundStation.lng, groundStation.lat, groundStation.height
      );

      //  遍历所有卫星，逐个检测可见性
      for (let i = 0; i < satellitePrimitive.value.length; i++) {
        const point = satellitePrimitive.value.get(i) as any;
        if (!point || !point.satelliteData) continue;

        const sat = point.satelliteData as Satellite;
        const satPosition = point.position;

        //  计算仰角
        const groundCartographic = Cesium.Cartographic.fromCartesian(groundPos);
        const satCartographic = Cesium.Cartographic.fromCartesian(satPosition);

        const groundGeocentric = Cesium.Ellipsoid.WGS84.cartographicToCartesian(
          new Cesium.Cartographic(groundCartographic.longitude, groundCartographic.latitude, 0)
        );
        const satGeocentric = Cesium.Ellipsoid.WGS84.cartographicToCartesian(satCartographic);
        const satToGround = Cesium.Cartesian3.subtract(satGeocentric, groundGeocentric, new Cesium.Cartesian3());
        
        if (Cesium.Cartesian3.magnitude(satToGround) < 0.001) {
          point.color = Cesium.Color.fromCssColorString("#74D3AE"); // 重合时恢复默认色
          point.pixelSize = 6;
          continue;
        }
        Cesium.Cartesian3.normalize(satToGround, satToGround);

        const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(groundGeocentric);
        Cesium.Cartesian3.normalize(up, up);

        // 计算仰角
        const dot = Cesium.Cartesian3.dot(up, satToGround);
        const clampedDot = Math.max(-1, Math.min(1, dot));
        let elevationAngle = Cesium.Math.toDegrees(Math.asin(clampedDot));
        elevationAngle = isNaN(elevationAngle) ? 0 : elevationAngle;

        // 4. 可见性判断（仰角>5°高亮）
        const MIN_VISIBLE_ELEVATION = 5;
        const isVisible = elevationAngle > MIN_VISIBLE_ELEVATION;

        // 5. 实时更新卫星样式（高亮/恢复）
        point.color = isVisible ? Cesium.Color.RED : Cesium.Color.fromCssColorString("#74D3AE");
        point.pixelSize = isVisible ? 10 : 6;
      }
    } catch (error) {
      console.error('实时更新卫星可见性失败:', error);
    }
  }

  // 重置所有卫星为默认颜色
  function resetAllSatelliteColor() {
    if (!satellitePrimitive.value) return;
    for (let i = 0; i < satellitePrimitive.value.length; i++) {
      const point = satellitePrimitive.value.get(i) as any;
      if (point) {
        point.color = Cesium.Color.fromCssColorString("#74D3AE");
        point.pixelSize = 6;
      }
    }
  }

  // 渲染地面站-卫星连线
  function renderLinkLine(groundPos: Cesium.Cartesian3, satPos: Cesium.Cartesian3) {
    clearLinkLine();

    const geometryInstance = new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions: [groundPos, satPos],
        width: 4,
        vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
        arcType: Cesium.ArcType.NONE
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED.withAlpha(1.0))
      }
    });

    const linkPrimitive = new Cesium.Primitive({
      geometryInstances: geometryInstance,
      appearance: new Cesium.PolylineColorAppearance({
        translucent: false
      }),
      asynchronous: false,
      show: true
    });
    viewer.value?.scene.primitives.add(linkPrimitive);
    viewer.value?.scene.primitives.raiseToTop(linkPrimitive);
    linkLinePrimitive.value = linkPrimitive;
  }

  // 辅助函数3：清除地面站-卫星连线
  function clearLinkLine() {
    if (linkLinePrimitive.value && viewer.value) {
      try {
        // 先判断是否已销毁，再执行移除
        if (!linkLinePrimitive.value.isDestroyed()) {
          viewer.value.scene.primitives.remove(linkLinePrimitive.value);
          linkLinePrimitive.value.destroy();
        }
      } catch (e) {
        console.warn('清除连线异常:', e);
      } finally {
        // 无论是否报错，都强制置空
        linkLinePrimitive.value = null;
      }
    }
  }

  // ！！！点击卫星触发链路预算
  const selectSatelliteForLinkBudget = async (sat: Satellite) => {
    if (!sat || !satellitePrimitive.value) {
      console.warn('选中卫星失败');
      linkBudget.value.results = null;
      linkBudget.value.isVisible = false;
      clearLinkLine();
      resetAllSatelliteColor();
      return;
    }

    const entitiesStore = useEntitiesStore();
    if (entitiesStore.groundStations.length === 0) {
      console.warn('地面站数据未加载');
      linkBudget.value.results = null;
      linkBudget.value.isVisible = false;
      clearLinkLine();
      resetAllSatelliteColor();
      return;
    }

    let targetPoint = null;
    for (let i = 0; i < satellitePrimitive.value.length; i++) {
      const point = satellitePrimitive.value.get(i) as any;
      if (point && point.satelliteId === sat.id) {
        targetPoint = point;
        break;
      }
    }

    if (!targetPoint) {
      console.warn(`未找到卫星${sat.id}的Primitive点`);
      linkBudget.value.results = null;
      linkBudget.value.isVisible = false;
      clearLinkLine();
      resetAllSatelliteColor();
      return;
    }

    await calculateLinkBudget(sat, targetPoint.position);

    if (satelliteRunning.value && positionUpdateTimer.value) {
      if ((window as any).linkBudgetTimer) clearInterval((window as any).linkBudgetTimer);
      (window as any).linkBudgetTimer = setInterval(async () => {
        if (!satellitePrimitive.value || !targetPoint) return;
        await calculateLinkBudget(sat, targetPoint.position);
      }, 1000);
    }
  };

  return { 
    viewerReady, 
    viewer, 
    setViewer, 
    destroyViewer,
    renderSatellites,
    renderSatelliteOrbits,
    renderSatelliteVelocities,
    satellitePrimitive,
    orbitPrimitive,
    velocityPrimitive,
    setSatelliteRunning,
    satelliteRunning,
    linkBudget,
    selectSatelliteForLinkBudget,
    updateAllSatellitesVisibility,
    linkLinePrimitive
  }
}) 

// ECI坐标转Cartesian3
function eciToCartesian3(positionEci: any[]): Cesium.Cartesian3[] {
  return positionEci.map(pos => {
    return new Cesium.Cartesian3(
      pos.x * 1000, 
      pos.y * 1000, 
      pos.z * 1000
    )
  })
}