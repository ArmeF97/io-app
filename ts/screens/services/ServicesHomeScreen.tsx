import * as pot from "italia-ts-commons/lib/pot";
import { Button, Tab, TabHeading, Tabs, Text } from "native-base";
import * as React from "react";
import { Animated, ListRenderItemInfo, StyleSheet } from "react-native";
import { NavigationScreenProps } from "react-navigation";
import { connect } from "react-redux";
import { ChooserListComponent } from "../../components/ChooserListComponent";
import { withLightModalContext } from "../../components/helpers/withLightModalContext";
import { withLoadingSpinner } from "../../components/helpers/withLoadingSpinner";
import { ScreenContentHeader } from "../../components/screens/ScreenContentHeader";
import TopScreenComponent from "../../components/screens/TopScreenComponent";
import { LightModalContextInterface } from "../../components/ui/LightModal";
import Markdown from "../../components/ui/Markdown";
import I18n from "../../i18n";
import { loadVisibleServices } from "../../store/actions/services";
import { Dispatch } from "../../store/actions/types";
import {
  Organization,
  organizationsAllSelector
} from "../../store/reducers/entities/organizations/organizationsAll";
import { GlobalState } from "../../store/reducers/types";
import customVariables from "../../theme/variables";

type OwnProps = NavigationScreenProps;

type Props = ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps> &
  OwnProps &
  LightModalContextInterface;

type State = {
  currentTab: number;
};

// Scroll range is directly influenced by floating header height
const SCROLL_RANGE_FOR_ANIMATION = 72;

const styles = StyleSheet.create({
  tabBarContainer: {
    elevation: 0,
    height: 40
  },
  tabBarContent: {
    fontSize: customVariables.fontSizeSmall
  },
  tabBarUnderline: {
    borderBottomColor: customVariables.tabUnderlineColor,
    borderBottomWidth: customVariables.tabUnderlineHeight
  },
  tabBarUnderlineActive: {
    height: customVariables.tabUnderlineHeight,
    // borders do not overlap eachother, but stack naturally
    marginBottom: -customVariables.tabUnderlineHeight,
    backgroundColor: customVariables.contentPrimaryBackground
  },
  searchDisableIcon: {
    color: customVariables.headerFontColor
  }
});

const AnimatedTabs = Animated.createAnimatedComponent(Tabs);
/**
 * A screen that contains all the Tabs related to services.
 */
class ServicesHomeScreen extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      currentTab: 0
    };
  }

  public componentDidMount() {
    // on mount, update visible services
    this.props.refreshServices();
  }

  private animatedScrollPositions: ReadonlyArray<Animated.Value> = [
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ];

  // tslint:disable-next-line: readonly-array
  private scollPositions: number[] = [0, 0, 0];

  public componentDidUpdate(_: Props, prevState: State) {
    // saving current list scroll position to enable header animation
    // when shifting between tabs
    if (prevState.currentTab !== this.state.currentTab) {
      this.animatedScrollPositions.map((__, i) => {
        // when current tab changes, listeners are not kept, so it is needed to
        // assign them again.
        this.animatedScrollPositions[i].removeAllListeners();
        this.animatedScrollPositions[i].addListener(animatedValue => {
          // tslint:disable-next-line: no-object-mutation
          this.scollPositions[i] = animatedValue.value;
        });
      });
    }
  }

  public render() {
    return (
      <TopScreenComponent
        title={I18n.t("services.title")}
        appLogo={true}
        contextualHelp={{
          title: I18n.t("services.title"),
          body: () => <Markdown>{I18n.t("services.servicesHelp")}</Markdown>
        }}
      >
        <React.Fragment>
          <ScreenContentHeader
            title={I18n.t("services.title")}
            icon={require("../../../img/icons/services-icon.png")}
            fixed={true}
          />
          {this.renderTabs()}
        </React.Fragment>
      </TopScreenComponent>
    );
  }

  private renderItem = (info: ListRenderItemInfo<Organization>) => {
    const item = info.item;
    return <Text>{item.name}</Text>;
  };

  private showModal = () => {
    this.props.showModal(
      <ChooserListComponent
        items={this.props.allOrganizations}
        keyExtractor={item => item.fiscalCode}
        renderItem={this.renderItem}
      />
    );
  };

  /**
   * Render Locals, Nationals and Other services tabs.
   */
  private renderTabs = () => {
    return (
      <AnimatedTabs
        tabContainerStyle={[styles.tabBarContainer, styles.tabBarUnderline]}
        tabBarUnderlineStyle={styles.tabBarUnderlineActive}
        onChangeTab={(evt: any) => {
          this.setState({ currentTab: evt.i });
        }}
        initialPage={0}
        style={{
          transform: [
            {
              translateY: SCROLL_RANGE_FOR_ANIMATION
            }
          ]
        }}
      >
        <Tab
          heading={
            <TabHeading>
              <Text style={styles.tabBarContent}>
                {I18n.t("services.tab.locals")}
              </Text>
            </TabHeading>
          }
        >
          <Button onPress={this.showModal}>
            <Text>Aggiungi le tue aree di interesse</Text>
          </Button>
        </Tab>
        <Tab
          heading={
            <TabHeading>
              <Text style={styles.tabBarContent}>
                {I18n.t("services.tab.national")}
              </Text>
            </TabHeading>
          }
        />
        <Tab
          heading={
            <TabHeading>
              <Text style={styles.tabBarContent}>
                {I18n.t("services.tab.otherServices")}
              </Text>
            </TabHeading>
          }
        />
      </AnimatedTabs>
    );
  };
}

const mapStateToProps = (state: GlobalState) => {
  const isLoading = pot.isLoading(state.entities.services.visible);
  return {
    allOrganizations: organizationsAllSelector(state),
    isLoading
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  refreshServices: () => dispatch(loadVisibleServices.request())
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withLightModalContext(withLoadingSpinner(ServicesHomeScreen)));
