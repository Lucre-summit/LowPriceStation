# LowPriceStation

An app that finds the cheapest place to charge an electric vehicle near a driver in Thailand. This context is the Thai charging market as the app's users experience it: sites, connectors, networks, and the tariffs that make "cheapest" a non-trivial question.

## Language

### Charging hardware

**Station**:
A physical site with one or more charging connectors, identified by its location and its owner.
_Avoid_: charger, ปั๊ม, point

**Connector**:
A single charging gun at a station, with one standard and one maximum power. A price applies to a connector, never to a station as a whole.
_Avoid_: charger, gun, plug, socket, EVSE

**Compatibility**:
Whether a connector's standard matches the car's inlet. Thailand's two national standards are Type 2 (AC) and CCS2 (DC); CHAdeMO is legacy and GB/T appears only on China-spec imports.
_Avoid_: support, fit, matching

**Availability**:
Whether a connector is occupied, free, or out of service right now. Live today only inside each network's own app.
_Avoid_: status, occupancy

### Providers

**Network**:
The organization that owns charging service and prices it, and whose own app account a driver must hold to start a charge (PEA VOLTA, EV Station PluZ, EleX by EGAT, MEA EV, EA Anywhere, and others).
_Avoid_: CPO, operator, provider, brand

**Roaming**:
Charging on a network you are not a member of. In Thailand, station discovery and status are partly shared between networks; paying across networks is not possible.
_Avoid_: interoperability, cross-network

### Pricing

**Tariff**:
The rule that turns a session into money on a given network. It is not a single number: it can vary by power band, time of day, and site.
_Avoid_: price, rate, fee

**Network rate**:
The tariff a network publishes for its stations generally.
_Avoid_: standard price, list price

**Site rate**:
A tariff that overrides the network rate at a specific station or zone.
_Avoid_: special price, location price

**Power band**:
A charging-speed tier that a tariff prices separately (e.g. 25 kW, 50–180 kW, 300–360 kW).
_Avoid_: speed tier, class, level

**TOU window**:
A time-of-day window in which a tariff's unit price differs — on-peak or off-peak, with weekends and public holidays often counted off-peak.
_Avoid_: peak hour, time slot

**Unit price**:
The price of one billed unit — a kWh, an hour, or a minute — as quoted by a tariff.
_Avoid_: rate, cost per unit

**Idle fee**:
A charge applied after charging finishes while the car stays plugged in, past a grace period, billed per minute or hour.
_Avoid_: overstay penalty, parking fee

**Session**:
One continuous charging event at one connector, from start to unplug.
_Avoid_: charge, top-up, fill

**Session cost**:
What a session actually costs the driver: energy delivered priced by the tariff, plus any time-based components and the idle fee.
_Avoid_: total price, charge cost
