# Photometrix

Photometrix assesses lighting illuminance in rooms against requested room targets.

## Language

**Illuminance assessment**:
A comparison of room illuminance measurements with the room target.
_Avoid_: Standards certification, compliance certification

**Illuminance**:
The amount of light incident on a surface per unit area, expressed in lux.
_Avoid_: Brightness, luminance

**Lux (lx)**:
The unit of illuminance, equal to one lumen per square metre.
_Avoid_: Lumens as a unit of illuminance

**Room category**:
The room's intended use: Classroom, Computer Lab, Offices, Lecture hall/Auditorium, or CAD Workstation. Requested targets are 500 lux for Classroom, Lecture hall/Auditorium, and CAD Workstation, and 300 lux for Computer Lab and Offices.
_Avoid_: Standards-certified category

**Room target**:
The requested illuminance value for a room, selected from its room category and expressed in lux.
_Avoid_: Certified compliance threshold

**Room**:
A named indoor space assessed using its room category and room target.
_Avoid_: Module, sensor

**Lighting module**:
The portable measurement unit comprising one ESP32 and three illuminance sensors.
_Avoid_: Room, individual sensor

**Sensor reading**:
An illuminance value from one measurement point, or an explicitly unavailable outcome at that point.
_Avoid_: Sample, room average

**Sample**:
The three sensor-reading outcomes collected by one lighting module in one measurement cycle.
_Avoid_: Individual reading, session

**Measurement session**:
A manually started and stopped assessment of one room using one portable lighting module.
_Avoid_: Continuous room installation, sample

**Live assessment**:
The current comparison of a complete, sufficiently recent sample's average illuminance with the session's room target.
_Avoid_: Session report, certified compliance

**Session report**:
A saved summary of a completed measurement session, including the complete-sample average, the room target applicable during collection, and any insufficient-data condition.
_Avoid_: Live assessment, standards certificate

**Recommendation**:
Simple guidance based on the illuminance assessment or unavailable data, intended to support the operator's review.
_Avoid_: Equipment command, diagnosed fault
